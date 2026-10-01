import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";


import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Configuración de proyecto de Firebase
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


const citasCollection = collection(db, 'citas');


const formCita = document.getElementById('form-cita');
const listaCitas = document.getElementById('lista-citas');
const tablaClientesBody = document.querySelector('#tabla-clientes tbody');
const listaOcupados = document.getElementById('lista-ocupados');

//Clave de acceso del tecnico
const CLAVE_TECNICO = 'om2026';

let tecnicoAutenticado = false;

let citasActuales = [];

const botonAccesoTecnico = document.getElementById('boton-acceso-tecnico');

const botonChat = document.getElementById('boton-chat');
const ventanaChat = document.getElementById('chat');
const cerrarChat = document.getElementById('cerrar-chat');
const formChat = document.getElementById('form-chat');
const inputChat = document.getElementById('input-chat');
const mensajesChat = document.getElementById('mensajes-chat');


onSnapshot(citasCollection, (snapshot) => {
  const citas = snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data()
  }));

  citasActuales = citas;

  renderizarCitas(citas);
  renderizarClientes(citas);
  renderizarOcupados(citas);
});

botonAccesoTecnico.addEventListener('click', () => {
  if (tecnicoAutenticado) {
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
      alert('Clave incorrecta.');
      return;
    } else {
      return;
    }
  }
  renderizarCitas(citasActuales);
  renderizarClientes(citasActuales);
});



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
    await addDoc(citasCollection, nuevaCita);
    formCita.reset();
    alert('Cita agendada correctamente ✅');
  } catch (error) {
    console.error('Error al guardar la cita:', error);
    alert('No se pudo agendar la cita. Revisa tu conexión o la configuración de Firebase.');
  }
});

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
      finalizarCita(boton.dataset.id); 
    });
  });
}

async function finalizarCita(idCita) {
  if (!tecnicoAutenticado) {
    const clave = prompt('Ingresa la clave del técnico para confirmar:');
    if (clave !== CLAVE_TECNICO) {
      alert('Clave incorrecta. Solo el técnico puede finalizar una cita.');
      return;
    }
  }

  try {
    const referenciaCita = doc(db, 'citas', idCita);
    await updateDoc(referenciaCita, { estado: 'finalizada' });
  } catch (error) {
    console.error('Error al finalizar la cita:', error);
    alert('No se pudo actualizar la cita.');
  }
}


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


botonChat.addEventListener('click', () => {
  ventanaChat.classList.toggle('oculto');
});

cerrarChat.addEventListener('click', () => {
  ventanaChat.classList.add('oculto');
});

let chatIniciado = false;
botonChat.addEventListener('click', () => {
  if (!chatIniciado) {
    agregarMensaje('¡Hola! Soy el asistente de Servicio Tecnico Neveras OM 🧊. ¿En qué podemos ayudarte hoy?', 'bot');
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
    return 'El costo depende del daño de la nevera. Espera un momento. Agenda una visita en la sección "Agendar cita" y  el tecnico se contactara con usted via Whatsapp.';
  }
  if (texto.includes('hora') || texto.includes('horario') || texto.includes('atienden')) {
    return 'Atendemos de lunes a sábado y con costo extra los domingos de 8:00 am a 6:00 pm.';
  }
  if (texto.includes('cita') || texto.includes('agendar')) {
    return 'Puedes agendar tu cita llenando el formulario en la sección "Agendar cita" Y el tecnico se contactara en brevedad.';
  }

  return 'Gracias por tu mensaje, muy pronto un técnico te responderá. También puedes agendar tu cita directamente en la web.';
}
