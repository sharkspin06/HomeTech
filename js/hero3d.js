// 3D hero: a protective shield with orbiting message bubbles that bounce off it.
// Decorative only. Falls back to the static SVG if WebGL or Three.js is unavailable,
// and stays still when the user prefers reduced motion.
(function () {
  "use strict";

  var canvas = document.getElementById("hero-canvas");
  var wrap = canvas && canvas.parentElement;
  if (!canvas || !window.THREE) return;

  var THREE = window.THREE;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) {
    return; // keep the SVG fallback
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  wrap.classList.add("has-3d");

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xe0f7ff, 0x0b3b4f, 0.9));
  var key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 6, 8);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0x5eead4, 0.8);
  rim.position.set(-6, -2, -4);
  scene.add(rim);

  // ---------- shield ----------
  var hero = new THREE.Group();
  scene.add(hero);

  var s = new THREE.Shape();
  s.moveTo(0, 2.4);
  s.bezierCurveTo(0.9, 1.95, 1.6, 1.8, 2.0, 1.75);
  s.lineTo(2.0, 0.4);
  s.bezierCurveTo(2.0, -1.2, 1.1, -2.2, 0, -2.7);
  s.bezierCurveTo(-1.1, -2.2, -2.0, -1.2, -2.0, 0.4);
  s.lineTo(-2.0, 1.75);
  s.bezierCurveTo(-1.6, 1.8, -0.9, 1.95, 0, 2.4);

  var shieldGeo = new THREE.ExtrudeGeometry(s, {
    depth: 0.5, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.14, bevelSegments: 6, curveSegments: 32
  });
  shieldGeo.center();
  var shield = new THREE.Mesh(shieldGeo, new THREE.MeshStandardMaterial({
    color: 0x0f766e, metalness: 0.35, roughness: 0.32
  }));
  hero.add(shield);

  // Inner raised plate for depth.
  var inner = new THREE.Mesh(
    new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 32 }),
    new THREE.MeshStandardMaterial({ color: 0x14b8a6, metalness: 0.2, roughness: 0.4 })
  );
  inner.geometry.center();
  inner.scale.set(0.78, 0.78, 1);
  inner.position.z = 0.45;
  hero.add(inner);

  // Check mark built from a tube along a polyline.
  var checkPath = new THREE.CurvePath();
  checkPath.add(new THREE.LineCurve3(new THREE.Vector3(-0.85, 0.05, 0), new THREE.Vector3(-0.2, -0.65, 0)));
  checkPath.add(new THREE.LineCurve3(new THREE.Vector3(-0.2, -0.65, 0), new THREE.Vector3(1.0, 0.85, 0)));
  var check = new THREE.Mesh(
    new THREE.TubeGeometry(checkPath, 48, 0.2, 16, false),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.25, emissive: 0x99f6e4, emissiveIntensity: 0.15 })
  );
  check.position.z = 0.7;
  hero.add(check);
  // Round caps on the tube ends.
  [new THREE.Vector3(-0.85, 0.05, 0.7), new THREE.Vector3(1.0, 0.85, 0.7), new THREE.Vector3(-0.2, -0.65, 0.7)].forEach(function (p) {
    var cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), check.material);
    cap.position.copy(p);
    hero.add(cap);
  });

  // Soft glowing ring behind the shield.
  var ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.3, 0.04, 12, 120),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.45 })
  );
  ring.position.z = -0.6;
  scene.add(ring);

  // ---------- message bubbles ----------
  function roundedRect(w, h, r) {
    var sh = new THREE.Shape();
    var x = -w / 2, y = -h / 2;
    sh.moveTo(x + r, y);
    sh.lineTo(x + w * 0.3, y);
    sh.lineTo(x + w * 0.18, y - 0.22); // speech tail
    sh.lineTo(x + w * 0.45, y);
    sh.lineTo(x + w - r, y);
    sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + h - r);
    sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    sh.lineTo(x + r, y + h);
    sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r);
    sh.quadraticCurveTo(x, y, x + r, y);
    return sh;
  }

  // Draws a symbol (!, ?, $, link) onto a small canvas for the bubble face.
  function faceTexture(symbol, color) {
    var c = document.createElement("canvas");
    c.width = c.height = 128;
    var ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.font = "bold 92px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, 64, 70);
    var t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  var bubbleGeo = new THREE.ExtrudeGeometry(roundedRect(1.1, 0.78, 0.22), {
    depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3
  });
  bubbleGeo.center();
  var faceGeo = new THREE.PlaneGeometry(0.62, 0.62);

  var BUBBLES = [
    { color: 0xef4444, symbol: "!", ink: "#ffffff" },
    { color: 0xf59e0b, symbol: "$", ink: "#ffffff" },
    { color: 0xef4444, symbol: "?", ink: "#ffffff" },
    { color: 0xf59e0b, symbol: "!", ink: "#ffffff" },
    { color: 0xe11d48, symbol: "$", ink: "#ffffff" },
    { color: 0xf97316, symbol: "?", ink: "#ffffff" }
  ];

  var bubbles = BUBBLES.map(function (b, i) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(bubbleGeo, new THREE.MeshStandardMaterial({ color: b.color, metalness: 0.15, roughness: 0.45 }));
    var face = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({ map: faceTexture(b.symbol, b.ink), transparent: true }));
    face.position.z = 0.15;
    g.add(body, face);
    g.scale.setScalar(0.85);
    scene.add(g);
    return {
      group: g,
      angle: (i / BUBBLES.length) * Math.PI * 2,
      speed: 0.25 + (i % 3) * 0.06,
      tilt: (i % 2 ? 1 : -1) * (0.25 + (i % 3) * 0.12),
      radius: 3.6 + (i % 3) * 0.35,
      bounce: 0
    };
  });

  // ---------- sparkles ----------
  var sparkCount = 90;
  var sparkPos = new Float32Array(sparkCount * 3);
  for (var i = 0; i < sparkCount; i++) {
    var r = 3 + Math.random() * 3.5;
    var a = Math.random() * Math.PI * 2;
    sparkPos[i * 3] = Math.cos(a) * r;
    sparkPos[i * 3 + 1] = (Math.random() - 0.5) * 6;
    sparkPos[i * 3 + 2] = Math.sin(a) * r - 1;
  }
  var sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  var sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0x99f6e4, size: 0.06, transparent: true, opacity: 0.8 }));
  scene.add(sparks);

  // ---------- interaction ----------
  var target = { x: 0, y: 0 };
  var current = { x: 0, y: 0 };

  window.addEventListener("pointermove", function (e) {
    target.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
    target.y = (e.clientY / window.innerHeight - 0.5) * 0.4;
  }, { passive: true });

  window.addEventListener("deviceorientation", function (e) {
    if (e.gamma == null) return;
    target.x = Math.max(-0.4, Math.min(0.4, e.gamma / 60));
    target.y = Math.max(-0.3, Math.min(0.3, (e.beta - 45) / 90));
  }, { passive: true });

  // ---------- sizing ----------
  var onResize = null;
  function resize() {
    var w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull the camera back on narrow screens so the orbit stays in frame.
    camera.position.z = w / h < 1 ? 13.5 : 11;
    camera.updateProjectionMatrix();
    if (onResize) onResize();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
  else window.addEventListener("resize", resize);

  // ---------- animation ----------
  var visible = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && onResize) onResize();
    }).observe(wrap);
  }

  var clock = new THREE.Clock();
  var t = 0;

  function update(dt) {
    t += dt;
    current.x += (target.x - current.x) * 0.06;
    current.y += (target.y - current.y) * 0.06;

    hero.rotation.y = Math.sin(t * 0.6) * 0.35 + current.x;
    hero.rotation.x = current.y;
    hero.position.y = Math.sin(t * 1.2) * 0.12;
    ring.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
    ring.material.opacity = 0.35 + Math.sin(t * 2) * 0.1;
    sparks.rotation.y = t * 0.05;

    bubbles.forEach(function (b, idx) {
      b.angle += b.speed * dt;
      // Every so often a bubble is "pushed back" by the shield.
      var pulse = Math.max(0, Math.sin(t * 0.8 + idx * 1.7));
      var push = Math.pow(pulse, 12) * 0.9;
      var rad = b.radius + push;
      var x = Math.cos(b.angle) * rad;
      var z = Math.sin(b.angle) * rad * 0.55;
      var y = Math.sin(b.angle) * rad * b.tilt + Math.sin(t * 1.5 + idx) * 0.15;
      b.group.position.set(x, y, z);
      // Face the viewer, with a gentle wobble.
      b.group.lookAt(camera.position.x, b.group.position.y, camera.position.z);
      b.group.rotation.z += Math.sin(t * 1.3 + idx) * 0.15;
      b.group.scale.setScalar(0.85 - push * 0.15);
    });
  }

  var running = false;

  function loop() {
    if (!visible) { running = false; return; }
    update(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function kick() {
    if (reduceMotion) {
      renderer.render(scene, camera);
      return;
    }
    if (running || !visible) return;
    running = true;
    clock.getDelta();
    requestAnimationFrame(loop);
  }

  if (reduceMotion) update(0.6); // one still frame with bubbles spread out
  onResize = kick;
  kick();
})();
