const API_BASE =
    "https://biblioteca-api.2242023198.workers.dev";

const RUTAS_API = {
    economia: `${API_BASE}/catalogo/economia`,
    matematicas: `${API_BASE}/catalogo/matematicas`,
    otros: `${API_BASE}/catalogo/otros`,
    leidos: `${API_BASE}/leidos`
};

const DOMINIOS_DRIVE = [
    "drive.google.com",
    "docs.google.com"
];

const NOMBRES_DISCIPLINA = {
    economia: "Economía",
    matematicas: "Matemáticas",
    otros: "Otros"
};

let catalogo = [];
let leidos = [];
let vistaActual = "coleccion";
let temporizadorBusqueda = null;

document.addEventListener(
    "DOMContentLoaded",
    iniciar
);


/* =========================================================
   INICIO
   ========================================================= */

async function iniciar() {

    configurarEventos();

    await cargarCatalogos();

    actualizarContadores();

    mostrarVista("coleccion");
}


/* =========================================================
   CARGA DE DATOS
   ========================================================= */

async function cargarCatalogos() {

    mostrarEstadoCarga();

    const resultados =
        await Promise.allSettled([
            cargarJSON(
                RUTAS_API.economia,
                "Economía"
            ),

            cargarJSON(
                RUTAS_API.matematicas,
                "Matemáticas"
            ),

            cargarJSON(
                RUTAS_API.otros,
                "Otros"
            ),

            cargarJSON(
                RUTAS_API.leidos,
                "Leídos"
            )
        ]);


    const economia =
        resultados[0].status === "fulfilled"
            ? resultados[0].value
            : [];


    const matematicas =
        resultados[1].status === "fulfilled"
            ? resultados[1].value
            : [];


    const otros =
        resultados[2].status === "fulfilled"
            ? resultados[2].value
            : [];


    const lecturas =
        resultados[3].status === "fulfilled"
            ? resultados[3].value
            : [];


    leidos =
        Array.isArray(lecturas)
            ? [...new Set(lecturas)]
            : [];


    catalogo =
        construirCatalogoCompleto(
            economia,
            matematicas,
            otros
        );


    const nombres = [
        "Economía",
        "Matemáticas",
        "Otros",
        "Leídos"
    ];


    resultados.forEach(
        (resultado, indice) => {

            if (
                resultado.status === "rejected"
            ) {

                console.error(
                    `Error cargando ${nombres[indice]}:`,
                    resultado.reason
                );
            }
        }
    );


    if (
        catalogo.length === 0
    ) {

        mostrarErrorCarga(
            "No se pudo cargar ningún catálogo. Revisa la conexión con el servidor."
        );

        return;
    }


    console.log(
        "Biblioteca cargada:",
        catalogo.length,
        "materiales"
    );
}


async function cargarJSON(
    ruta,
    nombre
) {

    const respuesta =
        await fetch(
            ruta,
            {
                cache: "no-store"
            }
        );


    if (!respuesta.ok) {

        throw new Error(
            `No se pudo cargar ${nombre}: ${respuesta.status}`
        );
    }


    const datos =
        await respuesta.json();


    if (
        !Array.isArray(datos)
    ) {

        throw new Error(
            `${nombre} no contiene un arreglo válido.`
        );
    }


    return datos;
}


/* =========================================================
   CONSTRUCCIÓN DEL CATÁLOGO
   ========================================================= */

function construirCatalogoCompleto(
    economia,
    matematicas,
    otros
) {

    const mapa =
        new Map();


    incorporarCatalogo(
        mapa,
        economia,
        "economia"
    );


    incorporarCatalogo(
        mapa,
        matematicas,
        "matematicas"
    );


    incorporarCatalogo(
        mapa,
        otros,
        "otros"
    );


    return Array.from(
        mapa.values()
    );
}


function incorporarCatalogo(
    mapa,
    materiales,
    disciplina
) {

    if (
        !Array.isArray(materiales)
    ) {
        return;
    }


    materiales.forEach(
        material => {

            if (
                !material ||
                typeof material !== "object"
            ) {
                return;
            }


            const id =
                material.id ||
                generarIdTemporal(
                    disciplina,
                    material.titulo
                );


            const linkDrive =
                obtenerEnlaceDrive(
                    material
                );


            mapa.set(
                id,
                {
                    ...material,

                    id,

                    disciplina,

                    linkDrive,

                    textoBusqueda:
                        construirTextoBusqueda(
                            {
                                ...material,
                                linkDrive
                            }
                        )
                }
            );
        }
    );
}


function construirTextoBusqueda(
    material
) {

    const autores =
        Array.isArray(
            material.autores
        )
            ? material.autores.join(" ")
            : material.autores || "";


    return [
        material.titulo || "",
        autores,
        material.editorial || "",
        material.anio || "",
        material.disciplina || ""
    ]
        .join(" ")
        .toLowerCase();
}


/* =========================================================
   EVENTOS
   ========================================================= */

function configurarEventos() {

    document
        .querySelectorAll(
            "[data-vista]"
        )
        .forEach(
            boton => {

                boton.addEventListener(
                    "click",
                    () => {

                        mostrarVista(
                            boton.dataset.vista
                        );
                    }
                );
            }
        );


    const busqueda =
        document.querySelector(
            "#busqueda"
        );


    if (busqueda) {

        busqueda.addEventListener(
            "input",
            () => {

                clearTimeout(
                    temporizadorBusqueda
                );


                temporizadorBusqueda =
                    setTimeout(
                        () => {

                            renderizarColeccion();

                        },
                        150
                    );
            }
        );
    }


    const filtro =
        document.querySelector(
            "#filtro-disciplina"
        );


    if (filtro) {

        filtro.addEventListener(
            "change",
            renderizarColeccion
        );
    }


    const formulario =
        document.querySelector(
            "#form-material"
        );


    if (formulario) {

        formulario.addEventListener(
            "submit",
            manejarFormulario
        );
    }


    document.addEventListener(
        "click",
        manejarClickGlobal
    );
}


function manejarClickGlobal(
    evento
) {

    const botonLeido =
        evento.target.closest(
            "[data-accion='leido']"
        );


    if (botonLeido) {

        const id =
            botonLeido.dataset.id;


        if (id) {

            alternarLeido(
                id
            );
        }


        return;
    }


    const botonEliminar =
        evento.target.closest(
            "[data-accion='eliminar']"
        );


    if (botonEliminar) {

        const id =
            botonEliminar.dataset.id;


        if (id) {

            eliminarMaterial(
                id
            );
        }
    }
}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function mostrarVista(
    vista
) {

    vistaActual =
        vista;


    document
        .querySelectorAll(
            ".vista"
        )
        .forEach(
            seccion => {

                seccion.classList.remove(
                    "activa"
                );
            }
        );


    const seccionActiva =
        document.getElementById(
            `vista-${vista}`
        );


    if (seccionActiva) {

        seccionActiva.classList.add(
            "activa"
        );
    }


    document
        .querySelectorAll(
            ".nav-btn"
        )
        .forEach(
            boton => {

                boton.classList.remove(
                    "activo"
                );
            }
        );


    const botonActivo =
        document.querySelector(
            `.nav-btn[data-vista="${vista}"]`
        );


    if (botonActivo) {

        botonActivo.classList.add(
            "activo"
        );
    }


    if (
        vista === "coleccion"
    ) {

        renderizarColeccion();
    }


    if (
        vista === "leidos"
    ) {

        renderizarLeidos();
    }
}


/* =========================================================
   COLECCIÓN
   ========================================================= */

function renderizarColeccion() {

    const contenedor =
        document.querySelector(
            "#lista-coleccion"
        );


    if (!contenedor) {
        return;
    }


    const busqueda =
        document.querySelector(
            "#busqueda"
        );


    const filtro =
        document.querySelector(
            "#filtro-disciplina"
        );


    const texto =
        busqueda?.value
            ?.trim()
            .toLowerCase() || "";


    const disciplina =
        filtro?.value ||
        "todas";


    const resultados =
        catalogo.filter(
            material => {

                const coincideTexto =
                    !texto ||
                    material.textoBusqueda.includes(
                        texto
                    );


                const coincideDisciplina =
                    disciplina === "todas" ||
                    material.disciplina === disciplina;


                return (
                    coincideTexto &&
                    coincideDisciplina
                );
            }
        );


    if (
        resultados.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>No se encontraron materiales</h3>
                <p>
                    Prueba con otro título, autor o disciplina.
                </p>
            </div>
        `;


        return;
    }


    contenedor.innerHTML =
        resultados
            .map(
                crearFichaMaterial
            )
            .join("");
}


/* =========================================================
   LEÍDOS
   ========================================================= */

function renderizarLeidos() {

    const contenedor =
        document.querySelector(
            "#lista-leidos"
        );


    if (!contenedor) {
        return;
    }


    const materialesLeidos =
        catalogo.filter(
            material =>
                leidos.includes(
                    material.id
                )
        );


    if (
        materialesLeidos.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>Aún no hay materiales leídos</h3>
                <p>
                    Marca un material como leído y aparecerá aquí.
                </p>
            </div>
        `;


        return;
    }


    contenedor.innerHTML =
        materialesLeidos
            .map(
                crearFichaMaterial
            )
            .join("");
}


/* =========================================================
   FICHA DE MATERIAL
   ========================================================= */

function crearFichaMaterial(
    material
) {

    const estaLeido =
        leidos.includes(
            material.id
        );


    const autores =
        Array.isArray(
            material.autores
        )
            ? material.autores.join(
                ", "
            )
            : material.autores ||
              "Autor no registrado";


    const datosBibliograficos =
        [
            material.editorial,
            material.anio
        ]
        .filter(Boolean)
        .join(" · ");


    const enlace =
        obtenerEnlaceDrive(
            material
        );


    const botonDrive =
        enlace
            ? `
                <a
                    class="boton boton-drive"
                    href="${escapeHTML(enlace)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Abrir documento
                </a>
            `
            : "";


    const botonEliminar = `
        <button
            class="boton boton-eliminar"
            type="button"
            data-accion="eliminar"
            data-id="${escapeHTML(
                material.id
            )}"
        >
            Eliminar
        </button>
    `;


    return `
        <article
            class="material-card ${
                estaLeido
                    ? "material-leido"
                    : ""
            }"
            data-id="${escapeHTML(
                material.id
            )}"
        >

            <div class="material-contenido">

                <div class="material-disciplina">
                    ${escapeHTML(
                        NOMBRES_DISCIPLINA[
                            material.disciplina
                        ] || "Otros"
                    )}
                </div>


                <h3 class="material-titulo">
                    ${escapeHTML(
                        material.titulo ||
                        "Título no registrado"
                    )}
                </h3>


                <p class="material-autores">
                    ${escapeHTML(
                        autores
                    )}
                </p>


                ${
                    datosBibliograficos
                        ? `
                            <p class="material-datos">
                                ${escapeHTML(
                                    datosBibliograficos
                                )}
                            </p>
                        `
                        : ""
                }


                <div class="material-acciones">

                    ${botonDrive}


                    <button
                        class="boton boton-leido ${
                            estaLeido
                                ? "boton-leido-activo"
                                : ""
                        }"
                        type="button"
                        data-accion="leido"
                        data-id="${escapeHTML(
                            material.id
                        )}"
                    >
                        ${
                            estaLeido
                                ? "Leído"
                                : "Marcar como leído"
                        }
                    </button>


                    ${botonEliminar}

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   MARCAR COMO LEÍDO
   ========================================================= */

async function alternarLeido(
    id
) {

    const boton =
        document.querySelector(
            `[data-accion="leido"][data-id="${CSS.escape(id)}"]`
        );


    if (boton) {
        boton.disabled = true;
    }


    try {

        const respuesta =
            await fetch(
                RUTAS_API.leidos,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            id
                        })
                }
            );


        const datos =
            await respuesta.json();


        if (
            !respuesta.ok
        ) {

            throw new Error(
                datos.error ||
                "No se pudo actualizar el estado de lectura."
            );
        }


        if (
            Array.isArray(
                datos.leidos
            )
        ) {

            leidos = [
                ...new Set(
                    datos.leidos
                )
            ];

        } else {

            actualizarLeidosLocalmente(
                id
            );
        }


        actualizarContadores();


        if (
            vistaActual === "leidos"
        ) {

            renderizarLeidos();

        } else {

            renderizarColeccion();
        }


    } catch (error) {

        console.error(
            "Error actualizando leído:",
            error
        );


        alert(
            "No se pudo actualizar el estado de lectura."
        );


    } finally {

        if (boton) {
            boton.disabled = false;
        }
    }
}


function actualizarLeidosLocalmente(
    id
) {

    const indice =
        leidos.indexOf(
            id
        );


    if (
        indice === -1
    ) {

        leidos.push(
            id
        );

    } else {

        leidos.splice(
            indice,
            1
        );
    }


    leidos = [
        ...new Set(
            leidos
        )
    ];
}


/* =========================================================
   AGREGAR MATERIAL
   ========================================================= */

async function manejarFormulario(
    evento
) {

    evento.preventDefault();


    const formulario =
        evento.currentTarget;


    const disciplina =
        document.querySelector(
            "#disciplina"
        ).value.trim();


    const titulo =
        document.querySelector(
            "#titulo"
        ).value.trim();


    const autoresTexto =
        document.querySelector(
            "#autores"
        ).value.trim();


    const editorial =
        document.querySelector(
            "#editorial"
        ).value.trim();


    const anioTexto =
        document.querySelector(
            "#anio"
        ).value.trim();


    const tipo =
        document.querySelector(
            "#tipo"
        ).value.trim();


    const linkDriveTexto =
        document.querySelector(
            "#link-drive"
        ).value.trim();


    if (
        !disciplina ||
        !titulo ||
        !autoresTexto ||
        !tipo
    ) {

        mostrarMensajeFormulario(
            "Completa los campos obligatorios.",
            true
        );


        return;
    }


    let anio = "";


    if (anioTexto) {

        anio =
            Number(
                anioTexto
            );


        if (
            !Number.isInteger(anio) ||
            anio < 1 ||
            anio > 2100
        ) {

            mostrarMensajeFormulario(
                "El año no es válido.",
                true
            );


            return;
        }
    }


    let linkDrive = "";


    if (
        tipo === "digital"
    ) {

        if (!linkDriveTexto) {

            mostrarMensajeFormulario(
                "Los materiales digitales necesitan un enlace de Drive.",
                true
            );


            return;
        }


        linkDrive =
            urlSegura(
                linkDriveTexto
            );


        if (
            !linkDrive ||
            !esEnlaceDrive(
                linkDrive
            )
        ) {

            mostrarMensajeFormulario(
                "El enlace debe ser de Google Drive o Google Docs.",
                true
            );


            return;
        }
    }


    const existe =
        catalogo.some(
            material =>
                normalizarTexto(
                    material.titulo
                ) ===
                normalizarTexto(
                    titulo
                )
        );


    if (existe) {

        mostrarMensajeFormulario(
            "Ese título ya existe en la biblioteca.",
            true
        );


        return;
    }


    const autores =
        autoresTexto
            .split(
                /\r?\n/
            )
            .map(
                autor =>
                    autor.trim()
            )
            .filter(Boolean);


    const id =
        await generarIdUnico(
            disciplina,
            autores
        );


    const nuevoMaterial = {

        id,

        disciplina,

        titulo,

        autores,

        editorial,

        anio,

        tipo,

        linkDrive
    };


    const boton =
        document.querySelector(
            "#btn-guardar"
        );


    if (boton) {

        boton.disabled = true;

        boton.textContent =
            "Guardando...";
    }


    try {

        const respuesta =
            await fetch(
                `${API_BASE}/material`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            nuevoMaterial
                        )
                }
            );


        const datos =
            await respuesta.json();


        if (
            !respuesta.ok
        ) {

            throw new Error(
                datos.error ||
                "No se pudo guardar el material."
            );
        }


        catalogo.push({

            ...nuevoMaterial,

            linkDrive:
                obtenerEnlaceDrive(
                    nuevoMaterial
                ),

            textoBusqueda:
                construirTextoBusqueda(
                    nuevoMaterial
                )
        });


        formulario.reset();


        actualizarContadores();


        mostrarMensajeFormulario(
            "Material agregado correctamente.",
            false
        );


        mostrarVista(
            "coleccion"
        );


        renderizarColeccion();


    } catch (error) {

        console.error(
            "Error guardando material:",
            error
        );


        mostrarMensajeFormulario(
            "No se pudo guardar el material. Revisa la conexión con el servidor.",
            true
        );


    } finally {

        if (boton) {

            boton.disabled = false;

            boton.textContent =
                "Guardar material";
        }
    }
}


/* =========================================================
   GENERACIÓN DE IDS
   ========================================================= */

async function generarIdUnico(
    disciplina,
    autores
) {

    let baseAutor =
        Array.isArray(autores) &&
        autores.length > 0
            ? autores[0]
            : "material";


    baseAutor =
        crearSlug(
            baseAutor
        );


    if (!baseAutor) {

        baseAutor =
            "material";
    }


    let numero =
        1;


    while (true) {

        const numeroTexto =
            String(
                numero
            ).padStart(
                3,
                "0"
            );


        const candidato =
            `${baseAutor}-${numeroTexto}`;


        const existe =
            catalogo.some(
                material =>
                    material.id ===
                    candidato
            );


        if (!existe) {

            return candidato;
        }


        numero++;
    }
}


/* =========================================================
   ELIMINAR MATERIAL
   ========================================================= */

async function eliminarMaterial(
    id
) {

    const material =
        catalogo.find(
            item =>
                item.id === id
        );


    if (!material) {
        return;
    }


    const confirmar =
        confirm(
            `¿Eliminar "${material.titulo}" de la biblioteca?\n\nEsta acción no se puede deshacer.`
        );


    if (!confirmar) {
        return;
    }


    const boton =
        document.querySelector(
            `[data-accion="eliminar"][data-id="${CSS.escape(id)}"]`
        );


    if (boton) {

        boton.disabled = true;

        boton.textContent =
            "Eliminando...";
    }


    try {

        const respuesta =
            await fetch(
                `${API_BASE}/material/${encodeURIComponent(
                    material.disciplina
                )}/${encodeURIComponent(
                    id
                )}`,
                {
                    method: "DELETE"
                }
            );


        const datos =
            await respuesta.json();


        if (
            !respuesta.ok
        ) {

            throw new Error(
                datos.error ||
                "No se pudo eliminar el material."
            );
        }


        catalogo =
            catalogo.filter(
                item =>
                    item.id !== id
            );


        leidos =
            leidos.filter(
                materialId =>
                    materialId !== id
            );


        actualizarContadores();


        if (
            vistaActual === "leidos"
        ) {

            renderizarLeidos();

        } else {

            renderizarColeccion();
        }


    } catch (error) {

        console.error(
            "Error eliminando material:",
            error
        );


        alert(
            "No se pudo eliminar el material."
        );


        if (boton) {

            boton.disabled = false;

            boton.textContent =
                "Eliminar";
        }
    }
}


/* =========================================================
   GOOGLE DRIVE
   ========================================================= */

function obtenerEnlaceDrive(
    material
) {

    if (!material) {
        return "";
    }


    const posiblesEnlaces = [

        material.linkDrive,

        material.link_drive,

        material.link,

        material.url,

        material.drive
    ];


    for (
        const posible
        of posiblesEnlaces
    ) {

        const enlace =
            urlSegura(
                posible
            );


        if (
            enlace &&
            esEnlaceDrive(
                enlace
            )
        ) {

            return enlace;
        }
    }


    return "";
}


function urlSegura(
    url
) {

    if (!url) {
        return "";
    }


    try {

        const texto =
            String(
                url
            ).trim();


        const enlace =
            new URL(
                texto
            );


        if (
            enlace.protocol !== "http:" &&
            enlace.protocol !== "https:"
        ) {

            return "";
        }


        return enlace.href;

    } catch {

        return "";
    }
}


function esEnlaceDrive(
    url
) {

    if (!url) {
        return false;
    }


    try {

        const enlace =
            new URL(
                url
            );


        return DOMINIOS_DRIVE.includes(
            enlace.hostname.toLowerCase()
        );

    } catch {

        return false;
    }
}


/* =========================================================
   UTILIDADES
   ========================================================= */

function generarIdTemporal(
    disciplina,
    titulo
) {

    return (
        `${disciplina}-${crearSlug(
            titulo
        )}`
    );
}


function crearSlug(
    texto
) {

    return normalizarTexto(
        texto
    )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        )
        .slice(
            0,
            60
        );
}


function normalizarTexto(
    texto
) {

    return String(
        texto || ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}


function escapeHTML(
    valor
) {

    return String(
        valor ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   CONTADORES
   ========================================================= */

function actualizarContadores() {

    const total =
        catalogo.length;


    const totalLeidos =
        catalogo.filter(
            material =>
                leidos.includes(
                    material.id
                )
        ).length;


    const contadorTotal =
        document.querySelector(
            "#contador-total"
        );


    const contadorLeidos =
        document.querySelector(
            "#contador-leidos"
        );


    if (contadorTotal) {

        contadorTotal.textContent =
            total;
    }


    if (contadorLeidos) {

        contadorLeidos.textContent =
            totalLeidos;
    }
}


/* =========================================================
   MENSAJES
   ========================================================= */

function mostrarMensajeFormulario(
    mensaje,
    error
) {

    const elemento =
        document.querySelector(
            "#mensaje-formulario"
        );


    if (!elemento) {
        return;
    }


    elemento.textContent =
        mensaje;


    elemento.classList.toggle(
        "error",
        error
    );


    elemento.classList.toggle(
        "exito",
        !error
    );


    setTimeout(
        () => {

            elemento.textContent =
                "";

        },
        4000
    );
}


/* =========================================================
   ESTADOS DE CARGA
   ========================================================= */

function mostrarEstadoCarga() {

    const coleccion =
        document.querySelector(
            "#lista-coleccion"
        );


    if (coleccion) {

        coleccion.innerHTML = `
            <div class="estado-vacio">
                <h3>Cargando biblioteca...</h3>
                <p>
                    Conectando con el catálogo.
                </p>
            </div>
        `;
    }
}


function mostrarErrorCarga(
    mensaje
) {

    const coleccion =
        document.querySelector(
            "#lista-coleccion"
        );


    if (coleccion) {

        coleccion.innerHTML = `
            <div class="estado-vacio">
                <h3>Error al cargar la biblioteca</h3>
                <p>
                    ${escapeHTML(mensaje)}
                </p>
            </div>
        `;
    }
}