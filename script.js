/* ============================================================
   NEVERAS OM - script.js
   Aquí vive toda la lógica: agendar citas, guardar clientes
   y el chat. Cada bloque está comentado para que veas qué
   hace cada instrucción.
   ============================================================ */

// --- 1. "Atrapamos" los elementos del HTML que vamos a usar ---
// document.getElementById busca en el HTML un elemento por su atributo id="..."
const formCita = document.getElementById('form-cita');
const listaCitas = document.getElementById('lista-citas');
const tablaClientesBody = document.querySelector('#tabla-clientes tbody');

const botonChat = document.getElementById('boton-chat');
const ventanaChat = document.getElementById('chat');
const cerrarChat = document.getElementById('cerrar-chat');
const formChat = document.getElementById('form-chat');
const inputChat = document.getElementById('input-chat');
const mensajesChat = document.getElementById('mensajes-chat');


/* ============================================================
   2. ALMACENAMIENTO
   Usamos localStorage: una "memoria" que el navegador guarda
   en el computador del usuario y que sigue ahí aunque cierres
   la pestaña. Solo puede guardar texto, por eso convertimos
   nuestros datos (arrays de objetos) a texto con JSON.stringify
   y los volvemos a leer con JSON.parse.
   ============================================================ */

// Leemos lo que ya había guardado (o un array vacío si es la primera vez)
function obtenerCitas() {
  const datos = localStorage.getItem('citas'); // devuelve texto o null
  return datos ? JSON.parse(datos) : [];
}

function guardarCitas(citas) {
  // JSON.stringify convierte el array de JS en texto para poder guardarlo
  localStorage.setItem('citas', JSON.stringify(citas));
}


/* ============================================================
   3. AGENDAR CITA
   ============================================================ */

// Al cargar la página, mostramos las citas que ya existían
document.addEventListener('DOMContentLoaded', () => {
  renderizarCitas();
  renderizarClientes();
});

// 'submit' se dispara cuando el usuario aprieta el botón "Agendar cita"
formCita.addEventListener('submit', function (evento) {
  // evento.preventDefault() evita que la página se recargue,
  // que es el comportamiento por defecto de un formulario
  evento.preventDefault();

  // Construimos un objeto con los datos que el usuario escribió.
  // .value trae lo que hay escrito dentro de cada input
  const nuevaCita = {
    id: Date.now(), // un número único basado en la fecha/hora actual, nos sirve de identificador
    nombre: document.getElementById('nombre-cita').value.trim(),
    telefono: document.getElementById('telefono-cita').value.trim(),
    direccion: document.getElementById('direccion-cita').value.trim(),
    fecha: document.getElementById('fecha-cita').value,
    hora: document.getElementById('hora-cita').value,
    descripcion: document.getElementById('descripcion-cita').value.trim()
  };

  // Recuperamos las citas guardadas, le agregamos la nueva y volvemos a guardar
  const citas = obtenerCitas();
  citas.push(nuevaCita);
  guardarCitas(citas);

  // También guardamos/actualizamos al cliente (función 4 más abajo)
  guardarCliente(nuevaCita);

  // Volvemos a pintar las listas en pantalla
  renderizarCitas();
  renderizarClientes();

  // Limpiamos el formulario para que quede listo para una nueva cita
  formCita.reset();

  alert('Cita agendada correctamente ✅');
});

// Dibuja la lista de citas en el <ul id="lista-citas">
function renderizarCitas() {
  const citas = obtenerCitas();

  // innerHTML = '' borra todo lo que había antes de volver a dibujar
  listaCitas.innerHTML = '';

  if (citas.length === 0) {
    listaCitas.innerHTML = '<li>No hay citas agendadas todavía.</li>';
    return;
  }

  // Ordenamos por fecha para que se vean en orden cronológico
  citas.sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));

  // Por cada cita creamos un <li> y lo agregamos a la lista
  citas.forEach((cita) => {
    const item = document.createElement('li');
    item.innerHTML = `
      <strong>${cita.nombre}</strong> — ${cita.fecha} ${cita.hora}<br>
      📍 ${cita.direccion}<br>
      📞 ${cita.telefono}<br>
      ${cita.descripcion ? '📝 ' + cita.descripcion : ''}
    `;
    listaCitas.appendChild(item);
  });
}


/* ============================================================
   4. GUARDAR INFO DE CLIENTES
   Guardamos los clientes en otra "carpeta" de localStorage,
   separada de las citas, usando el teléfono como identificador
   único (para no duplicar al mismo cliente si agenda dos veces).
   ============================================================ */

function obtenerClientes() {
  const datos = localStorage.getItem('clientes');
  return datos ? JSON.parse(datos) : [];
}

function guardarClientesEnStorage(clientes) {
  localStorage.setItem('clientes', JSON.stringify(clientes));
}

function guardarCliente(cita) {
  const clientes = obtenerClientes();

  // Buscamos si el cliente ya existe (mismo teléfono)
  const existente = clientes.find(c => c.telefono === cita.telefono);

  if (existente) {
    // Si ya existe, solo actualizamos sus datos y su última cita
    existente.nombre = cita.nombre;
    existente.direccion = cita.direccion;
    existente.ultimaCita = `${cita.fecha} ${cita.hora}`;
  } else {
    // Si es nuevo, lo agregamos al array
    clientes.push({
      nombre: cita.nombre,
      telefono: cita.telefono,
      direccion: cita.direccion,
      ultimaCita: `${cita.fecha} ${cita.hora}`
    });
  }

  guardarClientesEnStorage(clientes);
}

// Dibuja la tabla de clientes
function renderizarClientes() {
  const clientes = obtenerClientes();
  tablaClientesBody.innerHTML = '';

  clientes.forEach((cliente) => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${cliente.nombre}</td>
      <td>${cliente.telefono}</td>
      <td>${cliente.direccion}</td>
      <td>${cliente.ultimaCita}</td>
    `;
    tablaClientesBody.appendChild(fila);
  });
}


/* ============================================================
   5. CHAT
   Este chat es una SIMULACIÓN: el "bot" responde con mensajes
   automáticos. Para un chat real en vivo (hablar con una persona
   de verdad en tiempo real) se necesita un servidor y una base
   de datos (por ejemplo Firebase Realtime Database), porque el
   navegador de un visitante no puede "hablar" directamente con
   el navegador de otro visitante.
   ============================================================ */

// Abrir / cerrar la ventana de chat agregando o quitando la clase "oculto"
botonChat.addEventListener('click', () => {
  ventanaChat.classList.toggle('oculto');
});

cerrarChat.addEventListener('click', () => {
  ventanaChat.classList.add('oculto');
});

// Mensaje de bienvenida automático la primera vez que se abre
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
  if (texto === '') return; // no enviamos mensajes vacíos

  agregarMensaje(texto, 'cliente');
  inputChat.value = '';

  // Respuesta automática simulada, con un pequeño retraso para que
  // se sienta más natural (como si alguien estuviera escribiendo)
  setTimeout(() => {
    agregarMensaje(generarRespuesta(texto), 'bot');
  }, 700);
});

// Agrega una burbuja de mensaje al chat
function agregarMensaje(texto, autor) {
  const burbuja = document.createElement('div');
  burbuja.classList.add(autor === 'cliente' ? 'mensaje-cliente' : 'mensaje-bot');
  burbuja.textContent = texto;
  mensajesChat.appendChild(burbuja);

  // Hacemos scroll automático hacia el último mensaje
  mensajesChat.scrollTop = mensajesChat.scrollHeight;
}

// Respuestas simples según palabras clave del mensaje del cliente
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