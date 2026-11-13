$(document).ready(function () {
  let kind = "futsal", hours = 1, time = "", timer = null, left = 30;
  const prices = { futsal: 80, wally: 60 };
  let canchas = [];          // catálogo cargado desde data/canchas.json
  let filtro = "todas";

  /* ---------- Utilidades ---------- */
  function log(t) {
    // Anti-XSS: el texto entra como nodo con .text(), nunca como HTML
    $("#logs").prepend($("<p>").text("• " + new Date().toLocaleTimeString() + " — " + t));
  }
  function toast(t) {
    $("#toast").text(t).stop(true, true).slideDown(250);
    setTimeout(() => $("#toast").fadeOut(350), 3000);
  }
  function nombreTipo(k) { return k === "futsal" ? "Futsal" : "Wally"; }

  /* ---------- Navegación por hash ---------- */
  function page() {
    let id = location.hash.slice(1) || "inicio";
    if (!$("#" + id).hasClass("view")) id = "inicio";
    $(".view").hide().removeClass("active");
    $("#" + id).show().addClass("active");
    $("#nav").removeClass("open");
  }
  $(window).on("hashchange", page);
  page();
  $("#hamb").click(() => $("#nav").toggleClass("open"));
  $("a[href^='#']").click(() => setTimeout(page, 0));

  /* ---------- Resumen de reserva ---------- */
  function update() {
    let sub = prices[kind] * hours, guar = sub * .5;
    $("#kindText").text(nombreTipo(kind));
    $("#ball").text(kind === "futsal" ? "⚽" : "🏐");
    $("#timeText").text(time || "Sin seleccionar");
    $("#hoursText").text(hours);
    $("#rate").text("Bs " + prices[kind]);
    $("#subtotal").text("Bs " + sub);
    $("#guarantee").text("Bs " + guar);
    $("#total").text("Bs " + (sub + guar));
  }
  function setKind(k) {
    kind = k;
    $(".type").removeClass("chosen");
    $('.type[data-kind="' + k + '"]').addClass("chosen");
    update();
  }

  $(".type").click(function () {
    setKind($(this).data("kind"));
    log("Seleccionó " + kind);
  });
  $("[data-type]").click(function () { setKind($(this).data("type")); });

  $("#date").datepicker({
    dateFormat: "dd/mm/yy",
    minDate: 0,
    onSelect: d => {
      time = "";
      $(".slots button").removeClass("selected");
      log("Fecha seleccionada: " + d);
    }
  });

  // Delegación de eventos (.off().on()) en los horarios
  $("#slots").off("click", "button:not(:disabled)").on("click", "button:not(:disabled)", function () {
    time = $(this).data("time");
    $(".slots button").removeClass("selected");
    $(this).addClass("selected");
    update();
    log("Horario elegido: " + time);
  });

  $("#hours").on("input change", function () {
    hours = Math.max(1, Math.min(5, +this.value || 1));
    this.value = hours;
    update();
  });
  $("#minus").click(() => { hours = Math.max(1, hours - 1); $("#hours").val(hours).trigger("change"); });
  $("#plus").click(() => { hours = Math.min(5, hours + 1); $("#hours").val(hours).trigger("change"); });

  /* ---------- Modal de confirmación ---------- */
  function cerrar() {
    clearInterval(timer);
    timer = null;
    $("#modal").fadeOut(180).removeClass("show");
  }
  $("#confirm").click(() => {
    if (!$("#date").val() || !time) { toast("Selecciona una fecha y un horario disponible."); return; }
    $("#mKind").text("Cancha de " + nombreTipo(kind));
    $("#mTime").text($("#date").val() + " · " + time + " · " + hours + " hora(s)");
    $("#mTotal").text($("#total").text());
    left = 30;
    $("#timer").text("00:30");
    $("#modal").addClass("show").hide().fadeIn(180);
    clearInterval(timer);
    timer = setInterval(() => {
      left--;
      $("#timer").text("00:" + String(Math.max(0, left)).padStart(2, "0"));
      if (left <= 0) {
        cerrar();
        toast("Tarifa Flash Expirada. Vuelve a iniciar la confirmación.");
        log("Modal expiró");
      }
    }, 1000);
    log("Abrió modal de confirmación");
  });
  $("#x,#cancel").click(() => { cerrar(); log("Canceló la confirmación"); });
  $("#process").click(() => {
    cerrar();
    toast("✓ Reserva registrada correctamente (demostración).");
    log("Reserva confirmada: " + kind + ", " + time + ", total " + $("#total").text());
  });
  $("#modal").click(e => { if (e.target.id === "modal") cerrar(); });

  /* ---------- Acordeón y bitácora ---------- */
  $(".accordion button").click(function () {
    let box = $(this).next();
    $(".accordion article div").not(box).slideUp();
    box.slideToggle();
    $(this).find("b").text(box.is(":visible") ? "−" : "＋");
    log("Consultó una pregunta frecuente");
  });
  $("#clear").click(() => $("#logs").text("Bitácora limpiada."));

  /* =========================================================
     CATÁLOGO ASÍNCRONO (Fetch API nativo + Lazy Loading)
     ========================================================= */
  function estado(msg) { return $("<p>").addClass("estado-catalogo").text(msg); }

  // Anti-XSS: cada dato del JSON entra con .text() / .attr(), nunca concatenado como HTML
  function tarjeta(c) {
    const $img = $("<img>").attr({ src: c.portada, alt: "Cancha " + c.titulo, loading: "lazy", width: 200, height: 120 });
    const $meta = $("<p>").addClass("meta-cancha").append(
      $("<span>").text(c.zona + " • " + c.jugadores + " jugadores • "),
      $("<b>").text("Bs " + c.precio + "/h")
    );
    const $info = $("<div>").addClass("info-cancha").append(
      $("<h4>").text(c.titulo).attr("title", c.titulo),
      $("<p>").text(c.detalle),
      $meta
    );
    const $btn = $("<button>").attr("type", "button").addClass("btn-reservar").text("+ Reservar");
    return $("<article>").addClass("tarjeta-cancha").attr({ "data-id": c.id, "data-deporte": c.deporte }).append($img, $info, $btn);
  }

  function pintarCatalogo() {
    const lista = canchas.filter(c => filtro === "todas" || c.deporte === filtro);
    const $cont = $("#catalogoCanchas").empty();
    if (!lista.length) $cont.append(estado("No hay canchas para este filtro."));
    lista.forEach(c => $cont.append(tarjeta(c)));
    $("#conteoCatalogo").text("Mostrando " + lista.length + " de " + canchas.length);
  }

  // Llena el <select> del módulo de reservas con las canchas del catálogo
  function poblarSelectCanchas() {
    const $sel = $("#canchaSelect").empty();
    canchas.forEach(c => $sel.append($("<option>").val(c.titulo).text(c.titulo + " — Bs " + c.precio + "/h")));
  }

  function cargarCatalogo() {
    $("#catalogoCanchas").empty().append(estado("Cargando canchas…"));
    // 1. Consumo asíncrono con Fetch API nativo
    fetch("data/canchas.json")
      .then(response => {
        if (!response.ok) throw new Error("Error al cargar el catálogo (" + response.status + ")");
        return response.json();
      })
      .then(datos => {
        canchas = datos;
        pintarCatalogo();
        poblarSelectCanchas();
        log("Catálogo cargado: " + canchas.length + " canchas");
      })
      .catch(err => {
        console.error("Fallo en catálogo:", err);
        const $msg = estado("No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo. ");
        $msg.append($("<button>").attr("type", "button").addClass("btn-reintentar").text("Reintentar"));
        $("#catalogoCanchas").empty().append($msg);
        $("#conteoCatalogo").text("");
      });
  }

  // 2. Delegación de eventos (.off().on()) → un solo listener en el contenedor (ahorro de RAM)
  $("#catalogoCanchas").off("click", ".btn-reservar").on("click", ".btn-reservar", function () {
    const id = $(this).closest(".tarjeta-cancha").data("id");
    const c = canchas.find(x => x.id === id);
    if (!c) return;
    setKind(c.deporte);
    log("Eligió desde el catálogo: " + c.titulo);
    toast(c.titulo + " seleccionada. Ahora elige fecha y horario.");
    location.hash = "reservar";
  });
  $("#catalogoCanchas").off("click", ".btn-reintentar").on("click", ".btn-reintentar", cargarCatalogo);

  $("#filtrosCatalogo").off("click", ".chip").on("click", ".chip", function () {
    filtro = $(this).data("filtro");
    $("#filtrosCatalogo .chip").removeClass("activo");
    $(this).addClass("activo");
    pintarCatalogo();
    log("Filtró catálogo: " + filtro);
  });

  /* =========================================================
     MÓDULO DE RESERVAS Y LISTA DE ESPERA (anti-XSS + UI táctil)
     ========================================================= */
  function filaReserva(nombre, detalle) {
    return $("<li>").addClass("item-reserva").append(
      $("<strong>").text(nombre + " — "),
      $("<span>").text(detalle),
      $("<button>").attr({ type: "button", "aria-label": "Quitar reserva" }).addClass("btn-tactil btn-quitar").text("X")
    );
  }

  $("#formReserva").off("submit").on("submit", function (e) {
    e.preventDefault();
    const nombre = $("#clienteNombre").val().trim();
    const cancha = $("#canchaSelect").val();
    const turno = $("#turnoSelect").val();
    if (!nombre) return;
    // PREVENCIÓN XSS: nodos seguros con .text(), no HTML concatenado
    $("#listaReservas").append(filaReserva(nombre, cancha + " · " + turno + " hrs"));
    this.reset();
    log("Turno registrado: " + nombre + ", " + cancha + ", " + turno);
    toast("✓ Turno registrado (demostración).");
  });

  function anotarEquipo() {
    const tema = $("#inputEquipo").val().trim();
    if (!tema) return;
    const $fila = $("<div>").addClass("fila-espera");
    const $titulo = $("<span>").addClass("titulo-truncado").text(tema).attr("title", tema);
    const $quitar = $("<button>").attr({ type: "button", "aria-label": "Quitar de la lista" }).addClass("btn-tactil btn-quitar").text("X");
    $fila.append($titulo, $quitar);
    $("#listaEspera").append($fila);
    $("#inputEquipo").val("");
    log("Anotado en lista de espera: " + tema);
  }
  $("#btnAnotar").off("click").on("click", anotarEquipo);
  $("#inputEquipo").off("keydown").on("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); anotarEquipo(); }
  });

  // Delegación por Event Bubbling para eliminar filas dinámicas sin fugas de memoria
  $(".modulos").off("click", ".btn-quitar").on("click", ".btn-quitar", function () {
    $(this).closest(".item-reserva, .fila-espera").remove();
    log("Quitó un elemento de la lista");
  });

  cargarCatalogo();

  /* ---------- PWA: Service Worker ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(err => console.error("SW no registrado:", err));
    });
  }

  log("Sesión iniciada en DeporZone");
  update();
});
