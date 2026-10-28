// Obtenemos los elementos del formulario
const formulario = document.getElementById("formulario");
const campoNombre = document.getElementById("nombre");
const campoDescripcion = document.getElementById("descripcion");
const campoEstado = document.getElementById("estado");

// Obtenemos los espacios donde se muestran las actividades y mensajes
const listaActividades = document.getElementById("listaActividades");
const mensaje = document.getElementById("mensaje");
const tituloFormulario = document.getElementById("tituloFormulario");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const btnActualizarLista = document.getElementById("btnActualizarLista");

// Guarda el id de la actividad que se quiere editar
let idEditando = null;

// Esta funcion envia las solicitudes al servidor
async function solicitar(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            ...opciones.headers
        }
    });

    // Convertimos la respuesta en datos que pueda usar JavaScript
    const datos = await respuesta.json();

    // Si ocurre un error, mostramos el mensaje recibido
    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error en la solicitud.");
    }

    return datos;
}

// Muestra un mensaje debajo del formulario
function mostrarMensaje(texto) {
    mensaje.textContent = texto;
}

// Consulta las actividades que tiene guardadas el servidor
async function cargarActividades() {
    listaActividades.replaceChildren();

    const cargando = document.createElement("p");
    cargando.textContent = "Cargando actividades...";
    listaActividades.appendChild(cargando);

    try {
        // Pedimos la lista de actividades
        const actividades = await solicitar("/api/actividades");

        // Limpiamos el contenido anterior
        listaActividades.replaceChildren();

        // Si no hay actividades, mostramos un mensaje
        if (actividades.length === 0) {
            const vacio = document.createElement("p");
            vacio.textContent = "No hay actividades registradas.";
            listaActividades.appendChild(vacio);
            return;
        }

        // Mostramos cada actividad en la pagina
        actividades.forEach(mostrarActividad);

    } catch (error) {
        // Mostramos el error si no se puede consultar el servidor
        listaActividades.replaceChildren();

        const textoError = document.createElement("p");
        textoError.textContent = error.message;
        listaActividades.appendChild(textoError);
    }
}

// Crea el cuadro que muestra los datos de una actividad
function mostrarActividad(actividad) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";

    // Agregamos el nombre
    const titulo = document.createElement("h3");
    titulo.textContent = actividad.nombre;

    // Agregamos la descripcion
    const descripcion = document.createElement("p");
    descripcion.textContent = actividad.descripcion;

    // Mostramos el estado con un color diferente
    const estado = document.createElement("span");
    estado.className = "estado";

    if (actividad.estado === "Pendiente") {
        estado.classList.add("estado-pendiente");
    } else if (actividad.estado === "En proceso") {
        estado.classList.add("estado-en-proceso");
    } else {
        estado.classList.add("estado-completada");
    }

    estado.textContent = actividad.estado;

    // Boton para modificar la actividad
    const botonEditar = document.createElement("button");
    botonEditar.type = "button";
    botonEditar.textContent = "Editar";

    botonEditar.addEventListener("click", () => {
        editarActividad(actividad);
    });

    // Colocamos todos los elementos dentro de la tarjeta
    tarjeta.append(titulo, descripcion, estado, document.createElement("br"));
    tarjeta.appendChild(botonEditar);

    // Agregamos la tarjeta a la lista
    listaActividades.appendChild(tarjeta);
}

// Coloca los datos de la actividad en el formulario
function editarActividad(actividad) {
    idEditando = actividad.id;

    campoNombre.value = actividad.nombre;
    campoDescripcion.value = actividad.descripcion;
    campoEstado.value = actividad.estado;

    // Cambiamos los textos para indicar que se esta editando
    tituloFormulario.textContent = "Actualizar actividad";
    btnGuardar.textContent = "Guardar cambios";
    btnCancelar.hidden = false;

    mostrarMensaje("Editando: " + actividad.nombre);

    // Llevamos al usuario hasta el formulario
    formulario.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Limpia los campos y cancela la edicion
function cancelarEdicion() {
    idEditando = null;
    formulario.reset();

    tituloFormulario.textContent = "Registrar actividad";
    btnGuardar.textContent = "Registrar actividad";
    btnCancelar.hidden = true;

    mostrarMensaje("");
}

// Detecta cuando se envia el formulario
formulario.addEventListener("submit", async (evento) => {
    // Evita que la pagina se recargue
    evento.preventDefault();

    // Obtenemos los datos escritos
    const actividad = {
        nombre: campoNombre.value.trim(),
        descripcion: campoDescripcion.value.trim(),
        estado: campoEstado.value
    };

    // Revisamos que los campos principales no esten vacios
    if (!actividad.nombre || !actividad.descripcion) {
        mostrarMensaje("Completa todos los campos.");
        return;
    }

    // Revisamos si se esta registrando o editando
    const editando = idEditando !== null;

    const url = editando
        ? `/api/actividades/${idEditando}`
        : "/api/actividades";

    // POST registra y PUT actualiza
    const metodo = editando ? "PUT" : "POST";

    btnGuardar.disabled = true;

    try {
        // Enviamos los datos al servidor
        const resultado = await solicitar(url, {
            method: metodo,
            body: JSON.stringify(actividad)
        });

        // Limpiamos el formulario y mostramos el resultado
        cancelarEdicion();
        mostrarMensaje(resultado.mensaje);

        // Actualizamos la lista para mostrar los cambios
        await cargarActividades();

    } catch (error) {
        mostrarMensaje(error.message);
    } finally {
        btnGuardar.disabled = false;
    }
});

// Acciones de los botones
btnCancelar.addEventListener("click", cancelarEdicion);
btnActualizarLista.addEventListener("click", cargarActividades);

// Consultamos las actividades al abrir la pagina
cargarActividades();