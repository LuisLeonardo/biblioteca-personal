import json
from pathlib import Path


ARCHIVOS = [
    "data/economia.json",
    "data/matematicas.json",
    "data/otros.json"
]


def reparar_texto(texto):
    """
    Corrige texto UTF-8 que fue interpretado
    incorrectamente como Latin-1/Windows-1252.
    """

    sospechosos = (
        "Ã",
        "Â",
        "â",
        "ð",
        "�"
    )

    resultado = texto

    # Intentamos reparar más de una capa de corrupción
    for _ in range(3):

        if not any(
            caracter in resultado
            for caracter in sospechosos
        ):
            break

        try:

            reparado = resultado.encode(
                "latin1"
            ).decode(
                "utf-8"
            )

            resultado = reparado

        except (
            UnicodeEncodeError,
            UnicodeDecodeError
        ):
            break

    return resultado


def reparar_objeto(objeto):

    if isinstance(objeto, dict):

        return {
            clave: reparar_objeto(valor)
            for clave, valor in objeto.items()
        }

    if isinstance(objeto, list):

        return [
            reparar_objeto(elemento)
            for elemento in objeto
        ]

    if isinstance(objeto, str):

        return reparar_texto(objeto)

    return objeto


for ruta_archivo in ARCHIVOS:

    ruta = Path(ruta_archivo)

    if not ruta.exists():

        print(
            f"NO ENCONTRADO: {ruta}"
        )

        continue


    print(
        f"\nProcesando: {ruta}"
    )


    # Crear respaldo
    respaldo = ruta.with_suffix(
        ".backup.json"
    )

    if not respaldo.exists():

        respaldo.write_text(
            ruta.read_text(
                encoding="utf-8"
            ),
            encoding="utf-8"
        )

        print(
            f"Respaldo creado: {respaldo}"
        )


    # Leer JSON
    with open(
        ruta,
        "r",
        encoding="utf-8"
    ) as archivo:

        datos = json.load(
            archivo
        )


    # Reparar
    datos_reparados = reparar_objeto(
        datos
    )


    # Guardar correctamente como UTF-8
    with open(
        ruta,
        "w",
        encoding="utf-8"
    ) as archivo:

        json.dump(
            datos_reparados,
            archivo,
            ensure_ascii=False,
            indent=4
        )

        archivo.write("\n")


    print(
        f"REPARADO: {ruta}"
    )


print(
    "\nReparación terminada."
)