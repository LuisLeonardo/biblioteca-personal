const RUTAS = {
    economia: "data/economia.json",
    matematicas: "data/matematicas.json",
    otros: "data/otros.json",
    leidos: "data/leidos.json"
};

const CLAVES_STORAGE = {
    agregados: "biblioteca_agregados",
    leidos: "biblioteca_leidos"
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


/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", iniciar);


async function iniciar() {
    cargarDatosLocales();
    await cargarCatalogos();
    configurarEventos();
    actualizarContadores();
    mostrarVista("coleccion");
}


/* =========================================================
   DATOS LOCALES
========================================================= */

function cargarDatosLocales() {
    try {
        const agregados =
            JSON.parse(
                localStorage.getItem(
                    CLAVES_STORAGE.agregados
                )
            ) || [];

        window.materialesAgregados =
            Array.isArray(agregados)
                ? agregados
                : [];

    } catch (error) {
        console.error(
            "Error al cargar materiales agregados:",
            error
        );

        window.materialesAgregados = [];
    }


    try {
        const lecturas =
            JSON.parse(
                localStorage.getItem(
                    CLAVES_STORAGE.leidos
                )
            ) || [];

        leidos =
            Array.isArray(lecturas)
                ? lecturas
                : [];

    } catch (error) {
        console.error(
            "Error al cargar materiales leídos:",
            error
        );

        leidos = [];
    }
}


/* =========================================================
   CARGAR CATÁLOGOS
========================================================= */

async function cargarCatalogos() {

    const resultados =
        await Promise.allSettled([
            cargarJSON(
                RUTAS.economia,
                "Economía"
            ),

            cargarJSON(
                RUTAS.matematicas,
                "Matemáticas"
            ),

            cargarJSON(
                RUTAS.otros,
                "Otros"
            ),

            cargarJSON(
                RUTAS.leidos,
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

    const lecturasJSON =
        resultados[3].status === "fulfilled"
            ? resultados[3].value
            : [];


    if (
        resultados[3].status === "fulfilled" &&
        Array.isArray(lecturasJSON)
    ) {
        leidos = [
            ...new Set([
                ...leidos,
                ...lecturasJSON
            ])
        ];
    }


    catalogo =
        construirCatalogoCompleto(
            economia,
            matematicas,
            otros
        );


    resultados.forEach(
        (resultado, indice) => {

            if (
                resultado.status === "rejected"
            ) {
                const nombres = [
                    "Economía",
                    "Matemáticas",
                    "Otros",
                    "Leídos"
                ];

                console.error(
                    `Error cargando ${nombres[indice]}:`,
                    resultado.reason
                );
            }
        }
    );
}


async function cargarJSON(ruta, nombre) {

    const respuesta =
        await fetch(ruta, {
            cache: "no-store"
        });


    if (!respuesta.ok) {
        throw new Error(
            `No se pudo cargar ${nombre}: ${respuesta.status}`
        );
    }


    const datos =
        await respuesta.json();


    if (!Array.isArray(datos)) {
        throw new Error(
            `${nombre} no contiene un arreglo JSON válido.`
        );
    }


    return datos;
}


/* =========================================================
   CONSTRUIR CATÁLOGO
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


    const agregados =
        Array.isArray(
            window.materialesAgregados
        )
            ? window.materialesAgregados
            : [];


    agregados.forEach(material => {

        const disciplina =
            material.disciplina || "otros";


        const id =
            material.id ||
            `${disciplina}-${crearSlug(
                material.titulo
            )}`;


        const linkDrive =
            obtenerEnlaceDrive(material);


        mapa.set(id, {

            ...material,

            id,

            disciplina,

            agregado: true,

            linkDrive,

            textoBusqueda:
                construirTextoBusqueda({
                    ...material,
                    linkDrive
                })
        });
    });


    return Array.from(
        mapa.values()
    );
}


function incorporarCatalogo(
    mapa,
    materiales,
    disciplina
) {

    if (!Array.isArray(materiales)) {
        return;
    }


    materiales.forEach(material => {

        if (
            !material ||
            typeof material !== "object"
        ) {
            return;
        }


        const id =
            material.id ||
            `${disciplina}-${crearSlug(
                material.titulo
            )}`;


        const linkDrive =
            obtenerEnlaceDrive(material);


        mapa.set(id, {

            ...material,

            id,

            disciplina,

            agregado: false,

            linkDrive,

            textoBusqueda:
                construirTextoBusqueda({
                    ...material,
                    linkDrive
                })
        });
    });
}


function construirTextoBusqueda(
    material
) {

    const autores =
        Array.isArray(material.autores)
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
        .querySelectorAll("[data-vista]")
        .forEach(boton => {

            boton.addEventListener(
                "click",
                () => {

                    mostrarVista(
                        boton.dataset.vista
                    );
                }
            );
        });


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


function manejarClickGlobal(evento) {

    const botonLeido =
        evento.target.closest(
            "[data-accion='leido']"
        );


    if (botonLeido) {

        const id =
            botonLeido.dataset.id;


        if (id) {
            alternarLeido(id);
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
            eliminarMaterial(id);
        }
    }
}


/* =========================================================
   VISTAS
========================================================= */

function mostrarVista(vista) {
    vistaActual = vista;

    document.querySelectorAll(".vista").forEach((seccion) => {
        seccion.classList.remove("activa");
    });

    const seccionActiva = document.getElementById(`vista-${vista}`);

    if (seccionActiva) {
        seccionActiva.classList.add("activa");
    }

    document.querySelectorAll(".nav-btn").forEach((boton) => {
        boton.classList.remove("activo");
    });

    const botonActivo = document.querySelector(
        `.nav-btn[data-vista="${vista}"]`
    );

    if (botonActivo) {
        botonActivo.classList.add("activo");
    }

    if (vista === "coleccion") {
        renderizarColeccion();
    }

    if (vista === "leidos") {
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
        filtro?.value || "todas";


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


    /*
     * Obtiene el enlace desde linkDrive
     * o desde alguna variante compatible.
     */

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


    const botonEliminar =
        material.agregado
            ? `
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
            `
            : "";


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
   LEÍDO / NO LEÍDO
========================================================= */

function alternarLeido(id) {

    const indice =
        leidos.indexOf(id);


    if (indice === -1) {

        leidos.push(id);

    } else {

        leidos.splice(
            indice,
            1
        );
    }


    leidos =
        [...new Set(leidos)];


    guardarLeidos();

    actualizarContadores();


    if (
        vistaActual === "leidos"
    ) {

        renderizarLeidos();

    } else {

        renderizarColeccion();
    }
}


function guardarLeidos() {

    try {

        localStorage.setItem(
            CLAVES_STORAGE.leidos,
            JSON.stringify(
                leidos
            )
        );

    } catch (error) {

        console.error(
            "No se pudieron guardar las lecturas:",
            error
        );
    }
}


/* =========================================================
   AGREGAR MATERIAL
========================================================= */

function manejarFormulario(
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


    const mensaje =
        document.querySelector(
            "#mensaje-formulario"
        );


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
            Number(anioTexto);


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


    const id =
        generarIdUnico(
            disciplina,
            titulo
        );


    /*
     * El formulario pide un autor por línea,
     * por eso aquí se separan por saltos de línea.
     */

    const autores =
        autoresTexto
            .split(/\r?\n/)
            .map(
                autor =>
                    autor.trim()
            )
            .filter(Boolean);


    const nuevoMaterial = {

        id,

        titulo,

        autores,

        editorial,

        anio,

        tipo,

        linkDrive,

        disciplina,

        agregado: true
    };


    window.materialesAgregados.push(
        nuevoMaterial
    );


    guardarMaterialesAgregados();


    catalogo.push({

        ...nuevoMaterial,

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
}


/* =========================================================
   GUARDAR AGREGADOS
========================================================= */

function guardarMaterialesAgregados() {

    try {

        localStorage.setItem(
            CLAVES_STORAGE.agregados,
            JSON.stringify(
                window.materialesAgregados
            )
        );

    } catch (error) {

        console.error(
            "No se pudieron guardar los materiales:",
            error
        );
    }
}


/* =========================================================
   ELIMINAR MATERIAL
========================================================= */

function eliminarMaterial(
    id
) {

    const material =
        catalogo.find(
            item =>
                item.id === id
        );


    if (
        !material ||
        !material.agregado
    ) {
        return;
    }


    const confirmar =
        confirm(
            `¿Eliminar "${material.titulo}" de la biblioteca?`
        );


    if (!confirmar) {
        return;
    }


    window.materialesAgregados =
        window.materialesAgregados.filter(
            item =>
                item.id !== id
        );


    guardarMaterialesAgregados();


    catalogo =
        catalogo.filter(
            item =>
                item.id !== id
        );


    leidos =
        leidos.filter(
            leidoId =>
                leidoId !== id
        );


    guardarLeidos();


    actualizarContadores();


    if (
        vistaActual === "leidos"
    ) {

        renderizarLeidos();

    } else {

        renderizarColeccion();
    }
}


/* =========================================================
   ENLACES DE DRIVE
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
            String(url)
                .trim();


        const enlace =
            new URL(texto);


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
            new URL(url);


        return DOMINIOS_DRIVE.includes(
            enlace.hostname.toLowerCase()
        );

    } catch {

        return false;
    }
}


/* =========================================================
   IDS
========================================================= */

function generarIdUnico(
    disciplina,
    titulo
) {

    const base =
        `${disciplina}-${crearSlug(
            titulo
        )}`;


    let id =
        base;


    let contador =
        1;


    while (
        catalogo.some(
            material =>
                material.id === id
        ) ||
        window.materialesAgregados.some(
            material =>
                material.id === id
        )
    ) {

        contador++;

        id =
            `${base}-${contador}`;
    }


    return id;
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
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}


/* =========================================================
   CONTADORES
========================================================= */

function actualizarContadores() {

    /*
     * Estos elementos son opcionales.
     * Si todavía no existen en el HTML,
     * simplemente no hace nada.
     */

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
   MENSAJE DEL FORMULARIO
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
   SEGURIDAD HTML
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