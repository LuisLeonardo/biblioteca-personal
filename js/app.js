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
        material.disciplina || "",
        material.idioma || ""
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
            cargarRadar
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


    const filtroRadarIdioma =
        document.querySelector(
            "#filtro-radar-idioma"
        );


    if (filtroRadarIdioma) {

        filtroRadarIdioma.addEventListener(
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

        /*
         * Cambiar de pestaña NO actualiza el Radar.
         *
         * Solamente cargamos las selecciones guardadas
         * para saber qué publicaciones deben aparecer
         * como "Pendiente".
         *
         * La consulta a OpenAlex y a las fuentes solamente
         * ocurre al pulsar "Actualizar radar".
         */

        cargarSeleccionadas();
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
   FILTRO DE IDIOMA DEL RADAR
========================================================= */

function coincideIdiomaRadar(
    item,
    idiomaFiltro
) {

    const idioma =
        normalizarIdioma(
            item?.idioma
        );


    if (!idioma) {
        return idiomaFiltro === "otros";
    }


    const equivalencias = {

        es: [
            "es",
            "esp",
            "espanol",
            "spanish"
        ],

        en: [
            "en",
            "eng",
            "ingles",
            "english"
        ],

        fr: [
            "fr",
            "fra",
            "frances",
            "french"
        ],

        pt: [
            "pt",
            "por",
            "portugues",
            "portuguese"
        ],

        it: [
            "it",
            "ita",
            "italiano",
            "italian"
        ],

        de: [
            "de",
            "deu",
            "ger",
            "aleman",
            "german"
        ]

    };


    if (
        equivalencias[idiomaFiltro]
            ?.includes(idioma)
    ) {

        return true;
    }


    const idiomasConocidos =
        Object.values(
            equivalencias
        ).flat();


    return (
        idiomaFiltro === "otros" &&
        !idiomasConocidos.includes(idioma)
    );
}


function normalizarIdioma(
    idioma
) {

    return String(
        idioma || ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
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

async function cargarRadar() {

    const estado =
        document.querySelector(
            "#estado-radar"
        );

    const contenedor =
        document.querySelector(
            "#lista-radar"
        );

    if (!contenedor) {
        return;
    }

    if (estado) {
        estado.textContent =
            "Actualizando radar...";
    }

    contenedor.innerHTML = `
        <div class="estado-vacio">
            <h3>Cargando novedades...</h3>
            <p>
                Consultando las fuentes seleccionadas.
            </p>
        </div>
    `;

    try {

        /*
         * Cargar primero las novedades que ya
         * fueron seleccionadas y están guardadas
         * en GitHub.
         */

        const respuestaSeleccionadas =
            await fetch(
                RUTAS_API.radarSeleccionadas,
                {
                    cache: "no-store"
                }
            );

        const datosSeleccionadas =
            await respuestaSeleccionadas.json();

        if (!respuestaSeleccionadas.ok) {

            throw new Error(
                datosSeleccionadas.error ||
                "No se pudieron cargar las novedades seleccionadas."
            );
        }


        radarSeleccionadas =
            Array.isArray(
                datosSeleccionadas
            )
                ? datosSeleccionadas
                : Array.isArray(
                    datosSeleccionadas.seleccionadas
                )
                    ? datosSeleccionadas.seleccionadas
                    : Array.isArray(
                        datosSeleccionadas.resultados
                    )
                        ? datosSeleccionadas.resultados
                        : [];


        /*
         * Consultar nuevamente el Radar.
         *
         * ESTA ES LA ÚNICA FUNCIÓN QUE HACE
         * LA CONSULTA A LAS FUENTES.
         */

        const respuesta =
            await fetch(
                RUTAS_API.radar,
                {
                    cache: "no-store"
                }
            );

        const datos =
            await respuesta.json();

        if (!respuesta.ok) {

            throw new Error(
                datos.error ||
                "No se pudo actualizar el Radar."
            );
        }


        radar =
            Array.isArray(
                datos.resultados
            )
                ? datos.resultados
                : [];


        /*
         * Reconstruir los filtros a partir
         * de los resultados obtenidos.
         */

        renderizarFiltrosRadar();

        renderizarRadar();


        if (estado) {

            estado.textContent =
                `${radar.length} novedades encontradas.`;
        }


    } catch (error) {

        console.error(
            "Error cargando Radar:",
            error
        );

        contenedor.innerHTML = `
            <div class="estado-vacio">

                <h3>
                    No se pudo actualizar el Radar
                </h3>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>
        `;

        if (estado) {
            estado.textContent = "";
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
                            ${escapeHTML(categoria)}
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


    const filtroIdioma =
        document.querySelector(
            "#filtro-radar-idioma"
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


    const idioma =
        filtroIdioma?.value ||
        "todos";


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


                const coincideIdioma =
                    idioma === "todos" ||
                    coincideIdiomaRadar(
                        item,
                        idioma
                    );


                return (
                    coincideFuente &&
                    coincideCategoria &&
                    coincideOA &&
                    coincideIdioma
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
   FICHA DEL RADAR
========================================================= */

function crearFichaRadar(
    item
) {

    const autores =
        Array.isArray(
            item.autores
        )
            ? item.autores.join(
                ", "
            )
            : item.autores ||
              "Autor no registrado";


    const fecha =
        item.fecha
            ? formatearFecha(
                item.fecha
            )
            : "";


    const doi =
        item.doi ||
        "";


    const url =
        item.url ||
        item.enlace ||
        "";


    const accesoAbierto =
        item.accesoAbierto === true;


    const seleccionada =
        radarSeleccionadas.some(
            seleccion =>
                String(seleccion.id) ===
                String(item.id)
        );


    const botonSeleccionar =
        seleccionada
            ? `
                <button
                    class="boton boton-seleccionado"
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


    const botonConsulta =
        url
            ? `
                <a
                    class="boton boton-drive"
                    href="${escapeHTML(url)}"
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
                item.id || ""
            )}"
        >

            <div class="material-contenido">

                <div class="material-disciplina">

                    ${escapeHTML(
                        item.fuente ||
                        "Fuente no registrada"
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

                    ${
                        item.categoria
                            ? escapeHTML(
                                formatearCategoria(
                                    item.categoria
                                )
                            )
                            : ""
                    }

                    ${
                        fecha
                            ? ` · ${escapeHTML(fecha)}`
                            : ""
                    }

                    ${
                        item.idioma
                            ? ` · ${escapeHTML(item.idioma)}`
                            : ""
                    }

                </p>


                ${
                    doi
                        ? `
                            <p class="material-datos">
                                DOI:
                                ${escapeHTML(doi)}
                            </p>
                        `
                        : ""
                }


                ${
                    accesoAbierto
                        ? `
                            <p class="material-datos">
                                Acceso abierto
                            </p>
                        `
                        : ""
                }


                <div class="material-acciones">

                    ${botonConsulta}

                    ${botonSeleccionar}

                </div>

            </div>

        </article>
    `;
}


/* =========================================================
   NOVEDADES SELECCIONADAS
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
            <h3>Cargando novedades seleccionadas...</h3>
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
                "No se pudieron cargar las novedades seleccionadas."
            );
        }


        /*
         * El Worker devuelve:
         *
         * {
         *     seleccionadas: [...],
         *     total: N
         * }
         *
         * También aceptamos un arreglo directo
         * y la propiedad resultados para mantener
         * compatibilidad.
         */

        radarSeleccionadas =
            Array.isArray(
                datos
            )
                ? datos
                : Array.isArray(
                    datos.seleccionadas
                )
                    ? datos.seleccionadas
                    : Array.isArray(
                        datos.resultados
                    )
                        ? datos.resultados
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
                    No se pudieron cargar las novedades
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
                    Selecciona publicaciones desde el Radar académico.
                </p>

            </div>
        `;

        return;
    }


    contenedor.innerHTML =
        radarSeleccionadas
            .map(
                crearFichaSeleccionada
            )
            .join("");
}


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
            : item.autores ||
              "Autor no registrado";


    const fecha =
        item.fecha
            ? formatearFecha(
                item.fecha
            )
            : "";


    const url =
        item.url ||
        item.enlace ||
        "";


    const botonConsulta =
        url
            ? `
                <a
                    class="boton boton-drive"
                    href="${escapeHTML(url)}"
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
                item.id || ""
            )}"
        >

            <div class="material-contenido">

                <div class="material-disciplina">

                    ${escapeHTML(
                        item.fuente ||
                        "Fuente no registrada"
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

                    ${
                        item.categoria
                            ? escapeHTML(
                                formatearCategoria(
                                    item.categoria
                                )
                            )
                            : ""
                    }

                    ${
                        fecha
                            ? ` · ${escapeHTML(fecha)}`
                            : ""
                    }

                    ${
                        item.idioma
                            ? ` · ${escapeHTML(item.idioma)}`
                            : ""
                    }

                </p>


                <div class="material-acciones">

                    ${botonConsulta}


                    <button
                        class="boton boton-eliminar"
                        type="button"
                        data-accion="radar-eliminar-seleccion"
                        data-id="${escapeHTML(
                            item.id || ""
                        )}"
                    >
                        Quitar
                    </button>

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
                String(resultado.id) ===
                String(id)
        );


    if (!item) {

        console.error(
            "No se encontró la novedad:",
            id
        );

        return;
    }


    const boton =
        document.querySelector(
            `[data-accion="radar-seleccionar"][data-id="${CSS.escape(String(id))}"]`
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
                        JSON.stringify(item)
                }
            );


        const texto =
            await respuesta.text();


        let datos = {};

        try {

            datos =
                texto
                    ? JSON.parse(texto)
                    : {};

        } catch {

            datos = {};
        }


        if (!respuesta.ok) {

            throw new Error(
                datos.error ||
                datos.message ||
                "No se pudo guardar la selección."
            );
        }


        /*
         * Volver a leer el servidor.
         * Así el frontend refleja el estado
         * realmente guardado en GitHub.
         */

        await cargarSeleccionadas();


        /*
         * Actualizar las tarjetas del Radar
         * para que el botón pase a "Pendiente".
         */

        renderizarRadar();


    } catch (error) {

        console.error(
            "Error seleccionando novedad:",
            error
        );


        alert(
            `No se pudo guardar la selección.\n\n${error.message}`
        );


        if (boton) {

            boton.disabled = false;

            boton.textContent =
                "Seleccionar";
        }
    }
}


/* =========================================================
   ELIMINAR NOVEDAD SELECCIONADA
========================================================= */

async function eliminarNovedadSeleccionada(
    id
) {

    if (!id) {
        return;
    }


    const confirmar =
        confirm(
            "¿Quieres quitar esta novedad de la colección seleccionada?"
        );


    if (!confirmar) {
        return;
    }


    try {

        const respuesta =
            await fetch(
                `${RUTAS_API.radarSeleccionar}?id=${encodeURIComponent(id)}`,
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
                "No se pudo eliminar la novedad seleccionada."
            );
        }


        radarSeleccionadas =
            Array.isArray(
                datos.seleccionadas
            )
                ? datos.seleccionadas
                : radarSeleccionadas.filter(
                    item =>
                        String(item.id) !==
                        String(id)
                );


        renderizarSeleccionadas();


        if (
            vistaActual === "radar"
        ) {

            renderizarRadar();
        }


    } catch (error) {

        console.error(
            "Error eliminando novedad:",
            error
        );


        alert(
            `No se pudo eliminar la novedad: ${error.message}`
        );
    }
}


/* =========================================================
   LEÍDO
========================================================= */

async function alternarLeido(
    id
) {

    if (!id) {
        return;
    }


    const estaLeido =
        leidos.includes(
            id
        );


    const nuevosLeidos =
        estaLeido
            ? leidos.filter(
                item =>
                    item !== id
            )
            : [
                ...leidos,
                id
            ];


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
                        JSON.stringify(
                            {
                                leidos:
                                    nuevosLeidos
                            }
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
                "No se pudo actualizar el estado de lectura."
            );
        }


        leidos =
            Array.isArray(
                datos.leidos
            )
                ? [...new Set(datos.leidos)]
                : nuevosLeidos;


        actualizarContadores();


        if (
            vistaActual === "coleccion"
        ) {

            renderizarColeccion();
        }


        if (
            vistaActual === "leidos"
        ) {

            renderizarLeidos();
        }


    } catch (error) {

        console.error(
            "Error actualizando lectura:",
            error
        );


        alert(
            `No se pudo actualizar el estado: ${error.message}`
        );
    }
}


/* =========================================================
   FORMULARIO DE MATERIAL
========================================================= */

async function manejarFormulario(
    evento
) {

    evento.preventDefault();


    const disciplina =
        document.querySelector(
            "#disciplina"
        )?.value ||
        "";


    const titulo =
        document.querySelector(
            "#titulo"
        )?.value
            ?.trim() ||
        "";


    const autores =
        document.querySelector(
            "#autores"
        )?.value
            ?.trim() ||
        "";


    const editorial =
        document.querySelector(
            "#editorial"
        )?.value
            ?.trim() ||
        "";


    const anio =
        document.querySelector(
            "#anio"
        )?.value
            ?.trim() ||
        "";


    const tipo =
        document.querySelector(
            "#tipo"
        )?.value ||
        "";


    const linkDrive =
        document.querySelector(
            "#link-drive"
        )?.value
            ?.trim() ||
        "";


    if (
        !disciplina ||
        !titulo
    ) {

        mostrarMensajeFormulario(
            "La disciplina y el título son obligatorios.",
            true
        );

        return;
    }


    const nuevoMaterial = {

        id:
            generarIdMaterial(
                disciplina,
                titulo
            ),

        disciplina,

        titulo,

        autores:
            autores
                ? autores
                    .split(",")
                    .map(
                        autor =>
                            autor.trim()
                    )
                    .filter(Boolean)
                : [],

        editorial,

        anio,

        tipo,

        linkDrive
    };


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


        mostrarMensajeFormulario(
            "Material agregado correctamente.",
            false
        );


        evento.target.reset();


        await cargarCatalogos();

        actualizarContadores();

        renderizarColeccion();


    } catch (error) {

        console.error(
            "Error agregando material:",
            error
        );


        mostrarMensajeFormulario(
            `No se pudo agregar el material: ${error.message}`,
            true
        );
    }
}


/* =========================================================
   ELIMINAR MATERIAL
========================================================= */

async function eliminarMaterial(
    id
) {

    if (!id) {
        return;
    }


    const material =
        catalogo.find(
            item =>
                item.id === id
        );


    const titulo =
        material?.titulo ||
        "este material";


    const confirmar =
        confirm(
            `¿Quieres eliminar "${titulo}" de la biblioteca?`
        );


    if (!confirmar) {
        return;
    }


    try {

        const respuesta =
            await fetch(
                `${API_BASE}/material?id=${encodeURIComponent(id)}`,
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
                item =>
                    item !== id
            );


        actualizarContadores();


        if (
            vistaActual === "coleccion"
        ) {

            renderizarColeccion();
        }


        if (
            vistaActual === "leidos"
        ) {

            renderizarLeidos();
        }


    } catch (error) {

        console.error(
            "Error eliminando material:",
            error
        );


        alert(
            `No se pudo eliminar el material: ${error.message}`
        );
    }
}


/* =========================================================
   DRIVE
========================================================= */

function obtenerEnlaceDrive(
    material
) {

    if (!material) {
        return "";
    }


    const posibles =
        [
            material.linkDrive,
            material.drive,
            material.urlDrive,
            material.enlaceDrive,
            material.link
        ];


    for (
        const enlace
        of posibles
    ) {

        if (
            typeof enlace !== "string"
        ) {
            continue;
        }


        const limpio =
            enlace.trim();


        if (
            !limpio
        ) {
            continue;
        }


        if (
            esEnlaceDrive(
                limpio
            )
        ) {

            return limpio;
        }
    }


    return "";
}


function esEnlaceDrive(
    enlace
) {

    try {

        const url =
            new URL(
                enlace
            );


        return DOMINIOS_DRIVE.some(
            dominio =>
                url.hostname === dominio ||
                url.hostname.endsWith(
                    `.${dominio}`
                )
        );

    } catch {

        return false;
    }
}


/* =========================================================
   IDENTIFICADORES
========================================================= */

function generarIdMaterial(
    disciplina,
    titulo
) {

    const base =
        [
            disciplina,
            titulo,
            Date.now(),
            Math.random()
        ]
        .join("-");


    return hashTexto(
        base
    );
}


function generarIdTemporal(
    disciplina,
    titulo
) {

    return hashTexto(
        [
            disciplina,
            titulo
        ]
        .join("-")
    );
}


function hashTexto(
    texto
) {

    let hash =
        0;


    for (
        let i = 0;
        i < texto.length;
        i++
    ) {

        hash =
            (
                (
                    hash << 5
                ) -
                hash
            ) +
            texto.charCodeAt(i);


        hash |=
            0;
    }


    return (
        Math.abs(
            hash
        ).toString(36) +
        "-" +
        Date.now().toString(36)
    );
}


/* =========================================================
   UTILIDADES
========================================================= */

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


function formatearFecha(
    fecha
) {

    if (!fecha) {
        return "";
    }


    try {

        const fechaObj =
            new Date(
                fecha
            );


        if (
            Number.isNaN(
                fechaObj.getTime()
            )
        ) {

            return String(
                fecha
            );
        }


        return new Intl.DateTimeFormat(
            "es-MX",
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        ).format(
            fechaObj
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