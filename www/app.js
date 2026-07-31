// App de escaneo de stock — usa el plugin nativo @capacitor-mlkit/barcode-scanning
// (cámara nativa vía ML Kit, no la cámara del navegador) y @capacitor/preferences
// para guardar la URL/token del backend en el propio dispositivo.
//
// Sin bundler: los plugins quedan disponibles en window.Capacitor.Plugins.<Nombre>

(function () {
  var Plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
  var BarcodeScanner = Plugins.BarcodeScanner;
  var Preferences = Plugins.Preferences;

  var elPrincipal = document.getElementById('pantallaPrincipal');
  var elEscaner = document.getElementById('pantallaEscaner');
  var elConfirmar = document.getElementById('pantallaConfirmar');
  var elAjustes = document.getElementById('pantallaAjustes');
  var elToast = document.getElementById('toast');
  var elSkuLeido = document.getElementById('skuLeido');
  var elCantidad = document.getElementById('cantidad');
  var elUltimoResultado = document.getElementById('ultimoResultado');

  var skuActual = null;
  var config = { apiUrl: '', apiToken: '' };

  function mostrarToast(msg, duracionMs) {
    elToast.textContent = msg;
    elToast.classList.remove('oculto');
    setTimeout(function () { elToast.classList.add('oculto'); }, duracionMs || 3000);
  }

  // ---------- Ajustes (API_URL / API_TOKEN) ----------
  function cargarConfig() {
    if (!Preferences) return Promise.resolve();
    return Promise.all([
      Preferences.get({ key: 'api_url' }),
      Preferences.get({ key: 'api_token' })
    ]).then(function (res) {
      config.apiUrl = res[0].value || '';
      config.apiToken = res[1].value || '';
      document.getElementById('inputApiUrl').value = config.apiUrl;
      document.getElementById('inputApiToken').value = config.apiToken;
    });
  }

  function guardarConfig() {
    config.apiUrl = document.getElementById('inputApiUrl').value.trim();
    config.apiToken = document.getElementById('inputApiToken').value.trim();
    if (!Preferences) return;
    Preferences.set({ key: 'api_url', value: config.apiUrl });
    Preferences.set({ key: 'api_token', value: config.apiToken });
    mostrarToast('Ajustes guardados');
  }

  document.getElementById('btnAjustes').addEventListener('click', function () {
    elAjustes.classList.remove('oculto');
  });
  document.getElementById('btnCerrarAjustes').addEventListener('click', function () {
    elAjustes.classList.add('oculto');
  });
  document.getElementById('btnGuardarAjustes').addEventListener('click', function () {
    guardarConfig();
    elAjustes.classList.add('oculto');
  });

  // ---------- Escaneo ----------
  function iniciarEscaneo() {
    if (!BarcodeScanner) {
      mostrarToast('El plugin de escaneo no está disponible en este build.');
      return;
    }
    if (!config.apiUrl || !config.apiToken) {
      mostrarToast('Configura primero la URL y el token en Ajustes (⚙️).');
      elAjustes.classList.remove('oculto');
      return;
    }

    BarcodeScanner.checkPermissions().then(function (res) {
      if (res.camera === 'granted' || res.camera === 'limited') {
        asegurarModuloYArrancar();
      } else {
        BarcodeScanner.requestPermissions().then(function (res2) {
          if (res2.camera === 'granted' || res2.camera === 'limited') {
            asegurarModuloYArrancar();
          } else {
            mostrarToast('Necesito permiso de cámara para escanear.');
          }
        });
      }
    }).catch(function (err) {
      mostrarToast('Error comprobando permisos: ' + err);
    });
  }

  // El escáner de ML Kit depende de un módulo de Google Play Services que no
  // siempre viene instalado de fábrica. Si falta, hay que pedir su descarga
  // ANTES de arrancar la cámara — si no, la pantalla se queda en negro sin
  // ningún error visible.
  function asegurarModuloYArrancar() {
    if (typeof BarcodeScanner.isGoogleBarcodeScannerModuleAvailable !== 'function') {
      // Versión del plugin sin esta comprobación: intentamos arrancar directamente.
      arrancarCamara();
      return;
    }
    BarcodeScanner.isGoogleBarcodeScannerModuleAvailable().then(function (res) {
      if (res && res.available) {
        arrancarCamara();
        return;
      }
      mostrarToast('Descargando el módulo de escaneo de Google (solo la primera vez)…', 6000);
      var listenerPromise = BarcodeScanner.addListener(
        'googleBarcodeScannerModuleInstallProgress',
        function (event) {
          var progreso = event && typeof event.progress === 'number' ? event.progress : null;
          var estado = event && event.state ? String(event.state) : '';
          if (progreso !== null) {
            mostrarToast('Descargando módulo de escaneo… ' + progreso + '%', 4000);
          }
          if (progreso >= 100 || /complet/i.test(estado)) {
            listenerPromise.then(function (h) { h.remove(); });
            arrancarCamara();
          }
        }
      );
      BarcodeScanner.installGoogleBarcodeScannerModule().catch(function (err) {
        mostrarToast('No se pudo descargar el módulo de escaneo: ' + err);
      });
    }).catch(function (err) {
      // Si la comprobación falla, probamos a arrancar igualmente.
      arrancarCamara();
    });
  }

  function arrancarCamara() {
    document.body.classList.add('barcode-scanner-active');
    elEscaner.classList.remove('oculto');

    BarcodeScanner.addListener('barcodesScanned', function (event) {
      var codigos = event && event.barcodes ? event.barcodes : [];
      if (codigos.length > 0 && codigos[0].rawValue) {
        onCodigoLeido(codigos[0].rawValue);
      }
    });

    BarcodeScanner.startScan().catch(function (err) {
      mostrarToast('No se pudo iniciar la cámara: ' + err);
      pararCamara();
    });
  }

  function pararCamara() {
    document.body.classList.remove('barcode-scanner-active');
    elEscaner.classList.add('oculto');
    if (BarcodeScanner) {
      BarcodeScanner.removeAllListeners();
      BarcodeScanner.stopScan().catch(function () {});
    }
  }

  function onCodigoLeido(valor) {
    pararCamara();
    skuActual = valor;
    elSkuLeido.textContent = valor;
    elCantidad.value = 1;
    elConfirmar.classList.remove('oculto');
  }

  document.getElementById('btnEscanear').addEventListener('click', iniciarEscaneo);
  document.getElementById('btnCancelarEscaneo').addEventListener('click', pararCamara);
  document.getElementById('btnCancelarConfirmar').addEventListener('click', function () {
    elConfirmar.classList.add('oculto');
    skuActual = null;
  });

  // ---------- Registrar movimiento contra el backend (Apps Script) ----------
  function registrarMovimiento(signo) {
    if (!skuActual) return;
    var cantidad = parseInt(elCantidad.value, 10) || 1;
    var delta = signo * cantidad;

    elConfirmar.classList.add('oculto');
    mostrarToast('Enviando ' + skuActual + '…', 4000);

    fetch(config.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ sku: skuActual, delta: delta, token: config.apiToken })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          mostrarToast('Registrado: ' + res.sku + ' → cantidad ' + res.cantidadActual);
          elUltimoResultado.textContent = 'Último: ' + res.sku + ' (' + (delta > 0 ? '+' : '') + delta + ') el ' + new Date().toLocaleTimeString();
        } else {
          mostrarToast('El servidor respondió con error: ' + res.error);
        }
      })
      .catch(function (err) {
        // El WebView aplica CORS igual que un navegador: si Apps Script no
        // devuelve cabeceras CORS, el envío puede haberse procesado en el
        // servidor aunque aquí no podamos leer la respuesta. Verifica la
        // pestaña "Movimientos" de la Google Sheet si tienes dudas.
        mostrarToast('Enviado, pero sin confirmación del servidor (posible CORS). Revisa la hoja Movimientos si tienes dudas.', 5000);
        elUltimoResultado.textContent = 'Último envío (sin confirmar): ' + skuActual + ' (' + (delta > 0 ? '+' : '') + delta + ')';
      })
      .finally(function () {
        skuActual = null;
      });
  }

  document.getElementById('btnEntrada').addEventListener('click', function () { registrarMovimiento(1); });
  document.getElementById('btnSalida').addEventListener('click', function () { registrarMovimiento(-1); });

  // ---------- Arranque ----------
  document.addEventListener('DOMContentLoaded', function () {
    cargarConfig();
  });
})();
