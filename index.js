const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/consulta/:cuit", async (req, res) => {
  const cuit = req.params.cuit;

  if (!/^\d{11}$/.test(cuit)) {
    return res.status(400).json({ error: "CUIT inválido" });
  }

  try {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.goto("https://www.bcra.gob.ar/BCRAyVos/Situacion_Crediticia.asp", {
      waitUntil: "networkidle2"
    });

    await page.type("#cuit", cuit);
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    const datos = await page.evaluate(() => {
      const tabla = document.querySelector("table.table-striped");
      if (!tabla) return null;

      const filas = Array.from(tabla.querySelectorAll("tr"));
      if (filas.length < 2) return null;

      const columnas = filas[1].querySelectorAll("td");
      return {
        nombre: columnas[0].innerText.trim(),
        entidad: columnas[1].innerText.trim(),
        calificacion: columnas[2].innerText.trim(),
        fecha: columnas[3].innerText.trim()
      };
    });

    await browser.close();

    if (!datos) {
      return res.status(404).json({ error: "Sin resultados para este CUIT" });
    }

    res.json(datos);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno al consultar" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API corriendo en puerto ${PORT}`);
});
