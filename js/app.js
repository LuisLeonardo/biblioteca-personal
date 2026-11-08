const API_BASE =
    "https://biblioteca-api.2242023198.workers.dev";

const RUTAS_API = {
    economia: `${API_BASE}/catalogo/economia`,
    matematicas: `${API_BASE}/catalogo/matematicas`,
    otros: `${API_BASE}/catalogo/otros`,
    leidos: `${API_BASE}/leidos`,
    radar: `${API_BASE}/radar`,
    radarSeleccionadas: `${API_BASE}/radar/seleccionadas`,
    radarSeleccionar: `${API_BASE}/radar/seleccionar`
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

let radar = [];
let radarSeleccionadas = [];

let vistaActual = "coleccion";
let temporizadorBusqueda = null;


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciar
);


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


    const btnRadar =
        document.querySelector(
            "#btn-actualizar-radar"
        );


    if (btnRadar) {

        btnRadar.addEventListener(
            "click",
            () => cargarRadar(true)
        );
    }


    const filtroRadarFuente =
        document.querySelector(
            "#filtro-radar-fuente"
        );


    if (filtroRadarFuente) {

        filtroRadarFuente.addEventListener(
            "change",
            renderizarRadar
        );
    }


    const filtroRadarCategoria =
        document.querySelector(
            "#filtro-radar-categoria"
        );


    if (filtroRadarCategoria) {

        filtroRadarCategoria.addEventListener(
            "change",
            renderizarRadar
        );
    }


    const filtroRadarOA =
        document.querySelector(
            "#filtro-radar-oa"
        );


    if (filtroRadarOA) {

        filtroRadarOA.addEventListener(
            "change",
            renderizarRadar
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


        return;
    }


    const botonSeleccionar =
        evento.target.closest(
            "[data-accion='radar-seleccionar']"
        );


    if (botonSeleccionar) {

        const id =
            botonSeleccionar.dataset.id;


        if (id) {

            seleccionarNovedad(
                id
            );
        }


        return;
    }


    const botonEliminarSeleccion =
        evento.target.closest(
            "[data-accion='radar-eliminar-seleccion']"
        );


    if (botonEliminarSeleccion) {

        const id =
            botonEliminarSeleccion.dataset.id;


        if (id) {

            eliminarNovedadSeleccionada(
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


    if (
        vista === "radar"
    ) {

        cargarRadar();
    }


    if (
        vista === "seleccionadas"
    ) {

        cargarSeleccionadas();
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
   RADAR ACADÉMICO
========================================================= */

async function cargarRadar(
    forzar = false
) {

    const contenedor =
        document.querySelector(
            "#lista-radar"
        );


    const estado =
        document.querySelector(
            "#estado-radar"
        );


    if (!contenedor) {
        return;
    }


    /*
       Si ya tenemos resultados y no estamos
       forzando una nueva carga, no hacemos
       otra petición innecesaria.
    */

    if (
        radar.length > 0 &&
        !forzar
    ) {

        renderizarFiltrosRadar();

        renderizarRadar();

        return;
    }


    contenedor.innerHTML = `
        <div class="estado-vacio">
            <h3>Consultando Radar académico...</h3>
            <p>
                Buscando las novedades más recientes.
            </p>
        </div>
    `;


    if (estado) {

        estado.textContent =
            "Actualizando radar...";
    }


    try {

        const respuesta =
            await fetch(
                RUTAS_API.radar,
                {
                    cache: "no-store"
                }
            );


        const datos =
            await respuesta.json();


        if (
            !respuesta.ok
        ) {

            throw new Error(
                datos.error ||
                "No se pudo cargar el Radar."
            );
        }


        radar =
            Array.isArray(
                datos.resultados
            )
                ? datos.resultados
                : [];


        renderizarFiltrosRadar();

        renderizarRadar();


        if (estado) {

            const fecha =
                datos.actualizado
                    ? formatearFecha(
                        datos.actualizado
                    )
                    : "sin fecha";


            estado.innerHTML = `
                <strong>
                    ${radar.length}
                    ${
                        radar.length === 1
                            ? "novedad"
                            : "novedades"
                    }
                </strong>

                · Última actualización:
                ${escapeHTML(fecha)}
            `;
        }


    } catch (error) {

        console.error(
            "Error cargando Radar:",
            error
        );


        contenedor.innerHTML = `
            <div class="estado-vacio">
                <h3>No se pudo cargar el Radar</h3>
                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>
            </div>
        `;


        if (estado) {

            estado.textContent =
                "Error al actualizar el Radar.";
        }
    }
}


/* =========================================================
   FILTROS DEL RADAR
========================================================= */

function renderizarFiltrosRadar() {

    const filtroFuente =
        document.querySelector(
            "#filtro-radar-fuente"
        );


    const filtroCategoria =
        document.querySelector(
            "#filtro-radar-categoria"
        );


    if (
        !filtroFuente ||
        !filtroCategoria
    ) {
        return;
    }


    const fuentes =
        [
            ...new Set(
                radar
                    .map(
                        item =>
                            item.fuente
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "es"
                )
        );


    const categorias =
        [
            ...new Set(
                radar
                    .map(
                        item =>
                            item.categoria
                    )
                    .filter(Boolean)
            )
        ]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "es"
                )
        );


    const fuenteActual =
        filtroFuente.value;


    const categoriaActual =
        filtroCategoria.value;


    filtroFuente.innerHTML = `
        <option value="todas">
            Todas las fuentes
        </option>

        ${
            fuentes
                .map(
                    fuente => `
                        <option
                            value="${escapeHTML(fuente)}"
                        >
                            ${escapeHTML(fuente)}
                        </option>
                    `
                )
                .join("")
        }
    `;


    filtroCategoria.innerHTML = `
        <option value="todas">
            Todas las categorías
        </option>

        ${
            categorias
                .map(
                    categoria => `
                        <option
                            value="${escapeHTML(categoria)}"
                        >
                            ${escapeHTML(
                                formatearCategoria(
                                    categoria
                                )
                            )}
                        </option>
                    `
                )
                .join("")
        }
    `;


    if (
        fuentes.includes(
            fuenteActual
        )
    ) {

        filtroFuente.value =
            fuenteActual;
    }


    if (
        categorias.includes(
            categoriaActual
        )
    ) {

        filtroCategoria.value =
            categoriaActual;
    }
}


/* =========================================================
   RENDERIZAR RADAR
========================================================= */

function renderizarRadar() {

    const contenedor =
        document.querySelector(
            "#lista-radar"
        );


    if (!contenedor) {
        return;
    }


    const filtroFuente =
        document.querySelector(
            "#filtro-radar-fuente"
        );


    const filtroCategoria =
        document.querySelector(
            "#filtro-radar-categoria"
        );


    const filtroOA =
        document.querySelector(
            "#filtro-radar-oa"
        );


    const fuente =
        filtroFuente?.value ||
        "todas";


    const categoria =
        filtroCategoria?.value ||
        "todas";


    const soloOA =
        filtroOA?.checked ||
        false;


    const resultados =
        radar.filter(
            item => {

                const coincideFuente =
                    fuente === "todas" ||
                    item.fuente === fuente;


                const coincideCategoria =
                    categoria === "todas" ||
                    item.categoria === categoria;


                const coincideOA =
                    !soloOA ||
                    item.accesoAbierto === true;


                return (
                    coincideFuente &&
                    coincideCategoria &&
                    coincideOA
                );
            }
        );


    if (
        resultados.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="estado-vacio">

                <h3>
                    No hay novedades con estos filtros
                </h3>

                <p>
                    Prueba modificando los filtros del Radar.
                </p>

            </div>
        `;


        return;
    }


    contenedor.innerHTML =
        resultados
            .map(
                crearFichaRadar
            )
            .join("");
}


/* =========================================================
   FICHA RADAR
========================================================= */

function crearFichaRadar(
    item
) {

    const seleccionada =
        radarSeleccionadas.some(
            seleccion =>
                seleccion.id === item.id
        );


    const autores =
        Array.isArray(
            item.autores
        )
            ? item.autores.join(
                ", "
            )
            : "Autor no registrado";


    const fecha =
        item.fecha
            ? formatearFecha(
                item.fecha
            )
            : "Fecha no disponible";


    const accesoAbierto =
        item.accesoAbierto
            ? `
                <span class="radar-etiqueta">
                    Acceso abierto
                </span>
            `
            : "";


    const botonSeleccion =
        seleccionada
            ? `
                <button
                    class="boton boton-pendiente"
                    type="button"
                    disabled
                >
                    Pendiente
                </button>
            `
            : `
                <button
                    class="boton boton-seleccionar"
                    type="button"
                    data-accion="radar-seleccionar"
                    data-id="${escapeHTML(
                        item.id
                    )}"
                >
                    Seleccionar
                </button>
            `;


    const botonConsultar =
        item.url
            ? `
                <a
                    class="boton boton-drive"
                    href="${escapeHTML(
                        item.url
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Consultar
                </a>
            `
            : "";


    return `
        <article
            class="material-card radar-card"
            data-id="${escapeHTML(
                item.id
            )}"
        >

            <div class="material-contenido">

                <div class="material-disciplina">
                    ${escapeHTML(
                        item.fuente ||
                        "Fuente desconocida"
                    )}
                </div>


                <h3 class="material-titulo">
                    ${escapeHTML(
                        item.titulo ||
                        "Título no registrado"
                    )}
                </h3>


                <p class="material-autores">
                    ${escapeHTML(
                        autores
                    )}
                </p>


                <p class="material-datos">

                    ${escapeHTML(
                        fecha
                    )}

                    ${
                        item.doi
                            ? ` · DOI`
                            : ""
                    }

                </p>


                <div class="radar-etiquetas">

                    ${
                        item.categoria
                            ? `
                                <span class="radar-etiqueta">
                                    ${escapeHTML(
                                        formatearCategoria(
                                            item.categoria
                                        )
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${accesoAbierto}

                </div>


                <div class="material-acciones">

                    ${botonConsultar}

                    ${botonSeleccion}

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   SELECCIONAR NOVEDAD
========================================================= */

async function seleccionarNovedad(
    id
) {

    const item =
        radar.find(
            resultado =>
                resultado.id === id
        );


    if (!item) {
        return;
    }


    const boton =
        document.querySelector(
            `[data-accion="radar-seleccionar"][data-id="${CSS.escape(id)}"]`
        );


    if (boton) {

        boton.disabled = true;

        boton.textContent =
            "Guardando...";
    }


    try {

        const respuesta =
            await fetch(
                RUTAS_API.radarSeleccionar,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            item
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
                "No se pudo seleccionar la novedad."
            );
        }


        if (
            !radarSeleccionadas.some(
                seleccion =>
                    seleccion.id ===
                    item.id
            )
        ) {

            radarSeleccionadas.push(
                {
                    ...item,

                    seleccionadoEn:
                        new Date().toISOString()
                }
            );
        }


        renderizarRadar();


    } catch (error) {

        console.error(
            "Error seleccionando novedad:",
            error
        );


        alert(
            "No se pudo guardar la selección."
        );


        if (boton) {

            boton.disabled = false;

            boton.textContent =
                "Seleccionar";
        }
    }
}


/* =========================================================
   CARGAR SELECCIONADAS
========================================================= */

async function cargarSeleccionadas() {

    const contenedor =
        document.querySelector(
            "#lista-seleccionadas"
        );


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML = `
        <div class="estado-vacio">
            <h3>Cargando...</h3>
            <p>
                Recuperando tus novedades seleccionadas.
            </p>
        </div>
    `;


    try {

        const respuesta =
            await fetch(
                RUTAS_API.radarSeleccionadas,
                {
                    cache: "no-store"
                }
            );


        const datos =
            await respuesta.json();


        if (
            !respuesta.ok
        ) {

            throw new Error(
                datos.error ||
                "No se pudieron cargar las seleccionadas."
            );
        }


        radarSeleccionadas =
            Array.isArray(
                datos.seleccionadas
            )
                ? datos.seleccionadas
                : [];


        renderizarSeleccionadas();


    } catch (error) {

        console.error(
            "Error cargando seleccionadas:",
            error
        );


        contenedor.innerHTML = `
            <div class="estado-vacio">

                <h3>
                    No se pudieron cargar
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>
        `;
    }
}


/* =========================================================
   RENDERIZAR SELECCIONADAS
========================================================= */

function renderizarSeleccionadas() {

    const contenedor =
        document.querySelector(
            "#lista-seleccionadas"
        );


    if (!contenedor) {
        return;
    }


    if (
        radarSeleccionadas.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="estado-vacio">

                <h3>
                    No hay novedades seleccionadas
                </h3>

                <p>
                    Selecciona materiales desde el Radar
                    para conservarlos aquí.
                </p>

            </div>
        `;


        return;
    }


    const ordenadas =
        [...radarSeleccionadas]
            .sort(
                (a, b) =>
                    new Date(
                        b.seleccionadoEn ||
                        b.fecha ||
                        0
                    ) -
                    new Date(
                        a.seleccionadoEn ||
                        a.fecha ||
                        0
                    )
            );


    contenedor.innerHTML =
        ordenadas
            .map(
                crearFichaSeleccionada
            )
            .join("");
}


/* =========================================================
   FICHA SELECCIONADA
========================================================= */

function crearFichaSeleccionada(
    item
) {

    const autores =
        Array.isArray(
            item.autores
        )
            ? item.autores.join(
                ", "
            )
            : "Autor no registrado";


    const fecha =
        item.fecha
            ? formatearFecha(
                item.fecha
            )
            : "Fecha no disponible";


    const botonConsultar =
        item.url
            ? `
                <a
                    class="boton boton-drive"
                    href="${escapeHTML(
                        item.url
                    )}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Consultar
                </a>
            `
            : "";


    return `
        <article
            class="material-card radar-card"
            data-id="${escapeHTML(
                item.id
            )}"
        >

            <div class="material-contenido">

                <div class="material-disciplina">
                    ${escapeHTML(
                        item.fuente ||
                        "Fuente desconocida"
                    )}
                </div>


                <h3 class="material-titulo">
                    ${escapeHTML(
                        item.titulo ||
                        "Título no registrado"
                    )}
                </h3>


                <p class="material-autores">
                    ${escapeHTML(
                        autores
                    )}
                </p>


                <p class="material-datos">
                    ${escapeHTML(
                        fecha
                    )}
                </p>


                <div class="radar-etiquetas">

                    <span class="radar-etiqueta">
                        Pendiente
                    </span>

                    ${
                        item.accesoAbierto
                            ? `
                                <span class="radar-etiqueta">
                                    Acceso abierto
                                </span>
                            `
                            : ""
                    }

                </div>


                <div class="material-acciones">

                    ${botonConsultar}


                    <button
                        class="boton boton-eliminar"
                        type="button"
                        data-accion="radar-eliminar-seleccion"
                        data-id="${escapeHTML(
                            item.id
                        )}"
                    >
                        Eliminar
                    </button>

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   ELIMINAR SELECCIONADA
========================================================= */

async function eliminarNovedadSeleccionada(
    id
) {

    const confirmar =
        confirm(
            "¿Eliminar esta novedad de Novedades Seleccionadas?"
        );


    if (!confirmar) {
        return;
    }


    try {

        const respuesta =
            await fetch(
                `${RUTAS_API.radarSeleccionar}?id=${encodeURIComponent(
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
                "No se pudo eliminar la selección."
            );
        }


        radarSeleccionadas =
            radarSeleccionadas.filter(
                item =>
                    item.id !== id
            );


        renderizarSeleccionadas();


        if (
            vistaActual === "radar"
        ) {

            renderizarRadar();
        }


    } catch (error) {

        console.error(
            "Error eliminando selección:",
            error
        );


        alert(
            "No se pudo eliminar la novedad."
        );
    }
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
   RADAR: UTILIDADES
========================================================= */

function formatearFecha(
    fecha
) {

    try {

        const fechaObjeto =
            new Date(
                fecha
            );


        if (
            Number.isNaN(
                fechaObjeto.getTime()
            )
        ) {

            return String(
                fecha
            );
        }


        return fechaObjeto.toLocaleDateString(
            "es-MX",
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

    } catch {

        return String(
            fecha
        );
    }
}


function formatearCategoria(
    categoria
) {

    if (!categoria) {
        return "";
    }


    return String(
        categoria
    )
        .replace(
            /-/g,
            " "
        )
        .replace(
            /\b\w/g,
            letra =>
                letra.toUpperCase()
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