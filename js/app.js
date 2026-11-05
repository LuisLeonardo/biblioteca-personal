
"use strict";

/* =================================
   CONFIGURACIÓN
================================= */

const RUTAS = {
    economia: "data/economia.json",
    matematicas: "data/matematicas.json",
    otros: "data/otros.json",
    leidos: "data/leidos.json"
};

const CLAVE_LEIDOS = "biblioteca-leidos-v1";
const CLAVE_AGREGADOS = "biblioteca-agregados-v1";

const NOMBRES_DISCIPLINAS = {
    economia: "Economía",
    matematicas: "Matemáticas",
    otros: "Otros"
};

let catalogos = {
    economia: [],
    matematicas: [],
    otros: []
};

let leidos = new Set();
let materialesAgregados = {};
let todosLosMateriales = [];


/* =================================
   ELEMENTOS HTML
================================= */

const listaColeccion = document.querySelector("#lista-coleccion");
const listaLeidos = document.querySelector("#lista-leidos");
const busqueda = document.querySelector("#busqueda");
const filtroDisciplina = document.querySelector("#filtro-disciplina");
const formulario = document.querySelector("#form-material");

const campoTipo = document.querySelector("#tipo");
const campoLink = document.querySelector("#link-drive");
const mensajeFormulario = document.querySelector("#mensaje-formulario");


/* =================================
   FUNCIONES AUXILIARES
================================= */

// Evita insertar directamente texto del usuario como HTML.
function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caracter]);
}


// Facilita búsquedas sin distinguir mayúsculas ni acentos.
function normalizarTexto(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es");
}


// Genera identificadores únicos para los nuevos materiales.
function generarId(disciplina, titulo) {
    const slug = normalizarTexto(titulo)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30);

    const aleatorio = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);

    return `${disciplina}-${slug}-${Date.now().toString(36)}-${aleatorio}`;
}


// Lee información guardada en el navegador.
function leerLocal(clave, valorPredeterminado) {
    try {
        const contenido = localStorage.getItem(clave);

        return contenido === null
            ? valorPredeterminado
            : JSON.parse(contenido);

    } catch (error) {
        console.error("No se pudo leer el almacenamiento local:", error);
        return valorPredeterminado;
    }
}


// Guarda información en el navegador.
function guardarLocal(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
        return true;

    } catch (error) {
        console.error("No se pudo guardar la información:", error);
        return false;
    }
}


// Comprueba que el enlace sea una dirección HTTPS de Google Drive.
function obtenerLinkDrive(enlace) {
    try {
        const url = new URL(enlace);

        if (
            url.protocol === "https:" &&
            url.hostname === "drive.google.com"
        ) {
            return url.href;
        }

        return "";

    } catch {
        return "";
    }
}


/* =================================
   CARGA DE LOS CATÁLOGOS
================================= */

async function cargarArchivo(ruta) {
    const respuesta = await fetch(ruta);

    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar ${ruta}`);
    }

    return await respuesta.json();
}


async function cargarBiblioteca() {
    try {
        const [
            economia,
            matematicas,
            otros,
            leidosBase
        ] = await Promise.all([
            cargarArchivo(RUTAS.economia),
            cargarArchivo(RUTAS.matematicas),
            cargarArchivo(RUTAS.otros),
            cargarArchivo(RUTAS.leidos)
        ]);

        catalogos = {
            economia: Array.isArray(economia) ? economia : [],
            matematicas: Array.isArray(matematicas) ? matematicas : [],
            otros: Array.isArray(otros) ? otros : []
        };

        // Recupera los materiales agregados anteriormente.
        materialesAgregados = leerLocal(CLAVE_AGREGADOS, {});

        // Incorpora las altas locales a sus respectivos catálogos.
        Object.keys(catalogos).forEach(disciplina => {
            const agregados = Array.isArray(materialesAgregados[disciplina])
                ? materialesAgregados[disciplina]
                : [];

            catalogos[disciplina].push(...agregados);
        });

        // Si ya existe una lista local de lectura, tiene prioridad.
        // De lo contrario, se utiliza leidos.json.
        const leidosLocales = leerLocal(CLAVE_LEIDOS, null);

        const listaInicial = Array.isArray(leidosLocales)
            ? leidosLocales
            : Array.isArray(leidosBase)
                ? leidosBase
                : [];

        leidos = new Set(listaInicial);

        actualizarMateriales();

        renderizarColeccion();
        renderizarLeidos();

    } catch (error) {
        console.error(error);

        listaColeccion.textContent =
            "No se pudo cargar la biblioteca. Revisa los archivos JSON y las rutas.";

        listaLeidos.textContent =
            "No se pudo cargar la lista de materiales leídos.";
    }
}


// Reúne los materiales de todas las disciplinas.
function actualizarMateriales() {
    todosLosMateriales = [];

    Object.entries(catalogos).forEach(([disciplina, materiales]) => {
        materiales.forEach(material => {
            todosLosMateriales.push({
                ...material,
                _disciplina: disciplina
            });
        });
    });
}


/* =================================
   CONSTRUCCIÓN DE LAS TARJETAS
================================= */

function crearTarjeta(material) {
    const id = escaparHTML(material.id);
    const titulo = escaparHTML(material.titulo);

    const autores = Array.isArray(material.autores)
        ? material.autores.join(", ")
        : "";

    const metadatos = [
        escaparHTML(autores),
        material.editorial ? escaparHTML(material.editorial) : "",
        material.anio ? escaparHTML(material.anio) : "",
        NOMBRES_DISCIPLINAS[material._disciplina] || "",
        material.tipo === "digital" ? "Digital" : "Físico"
    ].filter(Boolean);

    const marcado = leidos.has(material.id);

    const link = material.tipo === "digital"
        ? obtenerLinkDrive(material.link_drive)
        : "";

    return `
        <article class="material-card">

            <div class="material-info">
                <h3>${titulo}</h3>
                <p>${metadatos.join(" · ")}</p>
            </div>

            <div class="material-acciones">

                <button
                    type="button"
                    class="btn-leido ${marcado ? "leido" : ""}"
                    data-id="${id}"
                    aria-pressed="${marcado}"
                >
                    Leído
                </button>

                ${
                    link
                        ? `<a
                            class="link-material"
                            href="${escaparHTML(link)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >Abrir en Drive</a>`
                        : ""
                }

            </div>

        </article>
    `;
}


/* =================================
   VISTA: COLECCIÓN
================================= */

function renderizarColeccion() {
    const termino = normalizarTexto(busqueda.value);
    const disciplinaSeleccionada = filtroDisciplina.value;

    const resultados = todosLosMateriales
        .filter(material => {
            const titulo = normalizarTexto(material.titulo);
            const autores = normalizarTexto(
                Array.isArray(material.autores)
                    ? material.autores.join(" ")
                    : ""
            );

            const editorial = normalizarTexto(material.editorial);

            const coincideBusqueda =
                titulo.includes(termino) ||
                autores.includes(termino) ||
                editorial.includes(termino);

            const coincideDisciplina =
                disciplinaSeleccionada === "todas" ||
                material._disciplina === disciplinaSeleccionada;

            return coincideBusqueda && coincideDisciplina;
        })
        .sort((a, b) =>
            a.titulo.localeCompare(b.titulo, "es")
        );

    listaColeccion.innerHTML = resultados
        .map(crearTarjeta)
        .join("");
}


/* =================================
   VISTA: LEÍDOS
================================= */

function renderizarLeidos() {
    const materialesLeidos = todosLosMateriales
        .filter(material => leidos.has(material.id))
        .sort((a, b) =>
            a.titulo.localeCompare(b.titulo, "es")
        );

    listaLeidos.innerHTML = materialesLeidos
        .map(crearTarjeta)
        .join("");
}


/* =================================
   CAMBIAR ESTADO DE LECTURA
================================= */

document.addEventListener("click", evento => {
    const boton = evento.target.closest(".btn-leido");

    if (!boton) return;

    const id = boton.dataset.id;

    if (leidos.has(id)) {
        leidos.delete(id);
    } else {
        leidos.add(id);
    }

    const guardado = guardarLocal(
        CLAVE_LEIDOS,
        [...leidos]
    );

    if (!guardado) {
        console.error("El cambio no pudo guardarse en el navegador.");
    }

    renderizarColeccion();
    renderizarLeidos();
});


/* =================================
   NAVEGACIÓN ENTRE VISTAS
================================= */

function mostrarVista(nombre) {
    document.querySelectorAll(".vista").forEach(vista => {
        vista.classList.toggle(
            "activa",
            vista.id === `vista-${nombre}`
        );
    });

    document.querySelectorAll(".nav-btn").forEach(boton => {
        boton.classList.toggle(
            "activo",
            boton.dataset.vista === nombre
        );
    });

    if (nombre === "coleccion") {
        renderizarColeccion();
    }

    if (nombre === "leidos") {
        renderizarLeidos();
    }
}


document.querySelectorAll(".nav-btn").forEach(boton => {
    boton.addEventListener("click", () => {
        mostrarVista(boton.dataset.vista);
    });
});


/* =================================
   BUSCADOR Y FILTRO
================================= */

busqueda.addEventListener("input", renderizarColeccion);

filtroDisciplina.addEventListener("change", renderizarColeccion);


/* =================================
   FORMULARIO: TIPO DE MATERIAL
================================= */

function actualizarCampoDrive() {
    const esDigital = campoTipo.value === "digital";

    campoLink.required = esDigital;
    campoLink.disabled = !esDigital;

    if (!esDigital) {
        campoLink.value = "";
    }
}

campoTipo.addEventListener("change", actualizarCampoDrive);

actualizarCampoDrive();


/* =================================
   FORMULARIO: AGREGAR MATERIAL
================================= */

formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    const disciplina = document.querySelector("#disciplina").value;
    const titulo = document.querySelector("#titulo").value.trim();

    const autores = document.querySelector("#autores").value
        .split("\n")
        .map(autor => autor.trim())
        .filter(Boolean);

    const editorial = document.querySelector("#editorial").value.trim();
    const anioTexto = document.querySelector("#anio").value.trim();
    const tipo = campoTipo.value;

    const linkDrive = campoLink.value.trim();

    // Comprueba que los datos obligatorios estén presentes.
    if (!disciplina || !titulo || autores.length === 0 || !tipo) {
        mensajeFormulario.textContent =
            "Completa los campos obligatorios.";

        return;
    }

    if (tipo === "digital" && !obtenerLinkDrive(linkDrive)) {
        mensajeFormulario.textContent =
            "Introduce un enlace válido de Google Drive.";

        campoLink.focus();
        return;
    }

    const anio = anioTexto ? Number(anioTexto) : null;

    if (
        anio !== null &&
        (!Number.isInteger(anio) || anio < 1 || anio > 2100)
    ) {
        mensajeFormulario.textContent =
            "Introduce un año válido.";

        return;
    }

    // Crea la ficha bibliográfica.
    const material = {
        id: generarId(disciplina, titulo),
        titulo: titulo,
        autores: autores,
        tipo: tipo
    };

    // Los campos opcionales solo se incorporan si tienen contenido.
    if (editorial) {
        material.editorial = editorial;
    }

    if (anio !== null) {
        material.anio = anio;
    }

    if (tipo === "digital") {
        material.link_drive = obtenerLinkDrive(linkDrive);
    }

    // Guarda la ficha en el catálogo correspondiente.
    if (!Array.isArray(materialesAgregados[disciplina])) {
        materialesAgregados[disciplina] = [];
    }

    materialesAgregados[disciplina].push(material);

    const guardado = guardarLocal(
        CLAVE_AGREGADOS,
        materialesAgregados
    );

    if (!guardado) {
        materialesAgregados[disciplina].pop();

        mensajeFormulario.textContent =
            "No se pudo guardar. Revisa el almacenamiento del navegador.";

        return;
    }

    // Actualiza la biblioteca sin recargar la página.
    catalogos[disciplina].push(material);

    actualizarMateriales();
    renderizarColeccion();

    formulario.reset();
    actualizarCampoDrive();

    mensajeFormulario.textContent =
        "Material agregado correctamente en este navegador.";
});


/* =================================
   INICIO DE LA APLICACIÓN
================================= */

cargarBiblioteca();
