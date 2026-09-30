/* ============================================================
   NEVERAS OM - script.js (versión con Firebase Firestore)

   IMPORTANTE: este archivo usa "import", por eso en el HTML
   debe cargarse así: <script type="module" src="script.js"></script>
   ============================================================ */

// --- 1. Traemos las piezas de Firebase que necesitamos desde su CDN ---
// initializeApp conecta este sitio con TU proyecto de Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

// De Firestore usamos:
// - getFirestore: obtiene la base de datos de tu proyecto
// - collection: apunta a una "carpeta" dentro de la base de datos (aquí, "citas")
// - addDoc: agrega un documento nuevo a una colección
// - onSnapshot: "escucha" la colección y se ejecuta automáticamente
//   cada vez que algo cambia, EN CUALQUIER DISPOSITIVO. Esta es la
//   pieza clave que reemplaza a localStorage.
// - doc / updateDoc: para modificar un documento que ya existe (ej. finalizar una cita)
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ⚠️ Configuración de TU proyecto de Firebase (Neveras OM)
const firebaseConfig = {
  apiKey: "AIzaSyDP33smZJ4Mwpzk2gCCib8e9YF-6NKS2r0",
  authDomain: "neveras-om.firebaseapp.com",
  projectId: "neveras-om",
  storageBucket: "neveras-om.firebasestorage.app",
  messagingSenderId: "184278509907",
  appId: "1:184278509907:web:ddb663fa16f65ee14319a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// "citas" es el nombre de la colección (carpeta) dentro de Firestore.
// Si no existe todavía, Firebase la crea sola en cuanto guardes la primera cita.
const citasCollection = collection(db, 'citas');


// --- 2. "Atrapamos" los elementos del HTML que vamos a usar ---
const formCita = document.getElementById('form-cita');
const listaCitas = document.getElementById('lista-citas');
const tablaClientesBody = document.querySelector('#tabla-clientes tbody');
const listaOcupados = document.getElementById('lista-ocupados');

// Clave simple para el técnico. OJO: esto NO es seguridad real,
// cualquiera que abra este archivo puede verla. Solo sirve como
// candado básico mientras el proyecto no tiene un login de verdad.
const CLAVE_TECNICO = 'om2026';

// "Interruptor" que indica si ya se ingresó la clave del técnico en esta
// visita. Empieza en false: por defecto, NADIE ve las direcciones.
// Al recargar la página vuelve a false (no queda guardado), así que hay
// que desbloquear de nuevo cada vez — eso es justamente lo que da seguridad.
let tecnicoAutenticado = false;

// Guardamos aquí la última lista de citas que llegó de Firebase, para
// poder volver a dibujar la pantalla (con o sin direcciones) sin tener
// que esperar a que cambie algo en la base de datos.
let citasActuales = [];

const botonAccesoTecnico = document.getElementById('boton-acceso-tecnico');

const botonChat = document.getElementById('boton-chat');
const ventanaChat = document.getElementById('chat');
const cerrarChat = document.getElementById('cerrar-chat');
const formChat = document.getElementById('form-chat');
const inputChat = document.getElementById('input-chat');
const mensajesChat = document.getElementById('mensajes-chat');


/* ============================================================
   3. ESCUCHAR LA BASE DE DATOS EN TIEMPO REAL
   onSnapshot se conecta a Firestore y ejecuta esta función:
   - la primera vez, con los datos que ya existían
   - y de nuevo, automáticamente, cada vez que CUALQUIER
     dispositivo agrega, edita o borra una cita.
   Por eso ya no necesitamos "guardarCitas" ni "obtenerCitas":
   Firestore se encarga de guardar, y onSnapshot de avisarnos.
   ============================================================ */
onSnapshot(citasCollection, (snapshot) => {
  // snapshot.docs es la lista de documentos actuales en la colección.
  // Convertimos cada documento en un objeto normal de JS, agregando
  // su "id" (que Firestore genera solo) para poder identificarlo después.
  const citas = snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));

  // Guardamos esta versión más reciente para poder re-dibujar después
  // (por ejemplo, cuando el técnico ingresa la clave) sin depender de
  // que Firebase avise de un cambio nuevo.
  citasActuales = citas;

  renderizarCitas(citas);
  renderizarClientes(citas);
  renderizarOcupados(citas);
});

// --- Botón de acceso técnico: desbloquea las direcciones ---
botonAccesoTecnico.addEventListener('click', () => {
  if (tecnicoAutenticado) {
    // Si ya estaba desbloqueado, este mismo botón sirve para "cerrar sesión"
    tecnicoAutenticado = false;
    botonAccesoTecnico.textContent = '🔑 Acceso técnico';
    botonAccesoTecnico.classList.remove('activo');
  } else {
    const clave = prompt('Ingresa la clave del técnico:');
    if (clave === CLAVE_TECNICO) {
      tecnicoAutenticado = true;
      botonAccesoTecnico.textContent = '🔓 Sesión técnico activa';
      botonAccesoTecnico.classList.add('activo');
    } else if (clave !== null) {
      // clave !== null evita mostrar la alerta si el usuario le dio "Cancelar"
      alert('Clave incorrecta.');
      return;
    } else {
      return;
    }
  }

  // Volvemos a dibujar la lista de citas y la tabla de clientes,
  // esta vez mostrando (o volviendo a ocultar) las direcciones reales.
  renderizarCitas(citasActuales);
  renderizarClientes(citasActuales);
});


/* ============================================================
   4. AGENDAR CITA
   ============================================================ */
formCita.addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const nuevaCita = {
    nombre: document.getElementById('nombre-cita').value.trim(),
    telefono: document.getElementById('telefono-cita').value.trim(),
    direccion: document.getElementById('direccion-cita').value.trim(),
    fecha: document.getElementById('fecha-cita').value,
    hora: document.getElementById('hora-cita').value,
    descripcion: document.getElementById('descripcion-cita').value.trim(),
    estado: 'pendiente'
  };

  try {
    // addDoc envía el objeto a Firestore. "await" hace que el código
    // espere a que termine de guardarse antes de seguir.
    await addDoc(citasCollection, nuevaCita);
    formCita.reset();
    alert('Cita agendada correctamente ✅');
    // No hace falta llamar a renderizarCitas() aquí: onSnapshot
    // detecta el cambio solo y actualiza la pantalla.
  } catch (error) {
    console.error('Error al guardar la cita:', error);
    alert('No se pudo agendar la cita. Revisa tu conexión o la configuración de Firebase.');
  }
});

// Dibuja la lista de citas en el <ul id="lista-citas">
function renderizarCitas(citas) {
  listaCitas.innerHTML = '';

  if (citas.length === 0) {
    listaCitas.innerHTML = '<li>No hay citas agendadas todavía.</li>';
    return;
  }

  citas.sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));

  citas.forEach((cita) => {
    const item = document.createElement('li');
    const finalizada = cita.estado === 'finalizada';
    if (finalizada) item.classList.add('cita-finalizada');

    item.innerHTML = `
      <strong>${cita.nombre}</strong> — ${cita.fecha} ${cita.hora}
      <span class="etiqueta-estado ${finalizada ? 'estado-ok' : 'estado-pendiente'}">
        ${finalizada ? 'Finalizada ✅' : 'Pendiente'}
      </span><br>
      📍 ${tecnicoAutenticado ? cita.direccion : '<em>Dirección protegida 🔒</em>'}<br>
      📞 ${cita.telefono}<br>
      ${cita.descripcion ? '📝 ' + cita.descripcion + '<br>' : ''}
      ${!finalizada ? `<button class="boton-finalizar" data-id="${cita.id}">Marcar como finalizada</button>` : ''}
    `;
    listaCitas.appendChild(item);
  });

  document.querySelectorAll('.boton-finalizar').forEach((boton) => {
    boton.addEventListener('click', () => {
      finalizarCita(boton.dataset.id); // aquí el id es un texto (string), así lo maneja Firestore
    });
  });
}

// El técnico marca una cita como finalizada
async function finalizarCita(idCita) {
  // Si ya iniciaste sesión como técnico, no hace falta pedir la clave otra vez
  if (!tecnicoAutenticado) {
    const clave = prompt('Ingresa la clave del técnico para confirmar:');
    if (clave !== CLAVE_TECNICO) {
      alert('Clave incorrecta. Solo el técnico puede finalizar una cita.');
      return;
    }
  }

  try {
    // doc(db, 'citas', idCita) apunta a ESE documento específico dentro de la colección
    const referenciaCita = doc(db, 'citas', idCita);
    // updateDoc cambia solo el campo que le digamos, sin tocar el resto
    await updateDoc(referenciaCita, { estado: 'finalizada' });
    // No hace falta redibujar manualmente: onSnapshot lo hace solo,
    // y además se lo notifica a TODOS los dispositivos conectados.
  } catch (error) {
    console.error('Error al finalizar la cita:', error);
    alert('No se pudo actualizar la cita.');
  }
}


/* ============================================================
   5. CLIENTES (derivados de las citas)
   En vez de tener una colección aparte, tomamos la lista de citas
   y sacamos los clientes únicos por número de teléfono.
   ============================================================ */
function renderizarClientes(citas) {
  const clientesPorTelefono = new Map();

  citas.forEach((cita) => {
    clientesPorTelefono.set(cita.telefono, {
      nombre: cita.nombre,
      telefono: cita.telefono,
      direccion: cita.direccion,
      ultimaCita: `${cita.fecha} ${cita.hora}`
    });
  });

  tablaClientesBody.innerHTML = '';
  clientesPorTelefono.forEach((cliente) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${cliente.nombre}</td>
      <td>${cliente.telefono}</td>
      <td>${tecnicoAutenticado ? cliente.direccion : '🔒 Protegida'}</td>
      <td>${cliente.ultimaCita}</td>
    `;
    tablaClientesBody.appendChild(fila);
  });
}


/* ============================================================
   6. DISPONIBILIDAD (fechas ocupadas)
   ============================================================ */
function renderizarOcupados(citas) {
  listaOcupados.innerHTML = '';

  const pendientes = citas.filter((c) => c.estado !== 'finalizada');

  if (pendientes.length === 0) {
    listaOcupados.innerHTML = '<li>No hay fechas ocupadas por ahora, ¡todo el horario está libre!</li>';
    return;
  }

  const fechasUnicas = [...new Set(pendientes.map((c) => c.fecha))].sort();

  fechasUnicas.forEach((fecha) => {
    const item = document.createElement('li');
    item.textContent = `📅 ${fecha} — horario ocupado`;
    listaOcupados.appendChild(item);
  });
}


/* ============================================================
   7. CHAT (sigue siendo una simulación local, no usa Firestore)
   Si más adelante quieres que el chat también sea en tiempo real
   entre dispositivos, se puede migrar de forma parecida, guardando
   cada mensaje como un documento en otra colección ("mensajes").
   ============================================================ */
botonChat.addEventListener('click', () => {
  ventanaChat.classList.toggle('oculto');
});

cerrarChat.addEventListener('click', () => {
  ventanaChat.classList.add('oculto');
});

let chatIniciado = false;
botonChat.addEventListener('click', () => {
  if (!chatIniciado) {
    agregarMensaje('¡Hola! Soy el asistente de Neveras OM 🧊. ¿En qué podemos ayudarte?', 'bot');
    chatIniciado = true;
  }
});

formChat.addEventListener('submit', function (evento) {
  evento.preventDefault();
  const texto = inputChat.value.trim();
  if (texto === '') return;

  agregarMensaje(texto, 'cliente');
  inputChat.value = '';

  setTimeout(() => {
    agregarMensaje(generarRespuesta(texto), 'bot');
  }, 700);
});

function agregarMensaje(texto, autor) {
  const burbuja = document.createElement('div');
  burbuja.classList.add(autor === 'cliente' ? 'mensaje-cliente' : 'mensaje-bot');
  burbuja.textContent = texto;
  mensajesChat.appendChild(burbuja);
  mensajesChat.scrollTop = mensajesChat.scrollHeight;
}

function generarRespuesta(mensaje) {
  const texto = mensaje.toLowerCase();

  if (texto.includes('precio') || texto.includes('costo') || texto.includes('cuanto')) {
    return 'El costo depende del daño de la nevera. Cuéntanos el modelo y la falla, o agenda una visita en la sección "Agendar cita".';
  }
  if (texto.includes('hora') || texto.includes('horario') || texto.includes('atienden')) {
    return 'Atendemos de lunes a sábado, de 8:00 am a 6:00 pm.';
  }
  if (texto.includes('cita') || texto.includes('agendar')) {
    return 'Puedes agendar tu cita llenando el formulario en la sección "Agendar cita" 📅';
  }

  return 'Gracias por tu mensaje, muy pronto un técnico te responderá. También puedes agendar tu cita directamente en la web.';
}
