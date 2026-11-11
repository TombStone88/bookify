import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const BOOKS_DATA = [
  {
    title: 'THE ODYSSEY',
    author: 'Homer',
    quote: 'Of all creatures that breathe and move upon the earth, nothing is bred that is weaker than man.',
    base: '#16233d',
    accent: '#d4a373',
    x: -2.6,
    rotY: 0.45,
  },
  {
    title: 'DEMON COPPERHEAD',
    author: 'Barbara Kingsolver',
    quote: "First I got myself born. A decent crowd was on hand to watch, and they've always had plenty to say.",
    base: '#3b1e1b',
    accent: '#e09f67',
    x: 0.0,
    rotY: 0.05,
  },
  {
    title: 'KLARA AND THE SUN',
    author: 'Kazuo Ishiguro',
    quote: "Do you believe in the human heart? I don't mean simply the organ, obviously. But do you believe there is something that makes each of us special?",
    base: '#182d24',
    accent: '#82c99b',
    x: 2.6,
    rotY: -0.45,
  },
];

function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

function createBookMaterials(title, quoteAuthor, quoteText, baseColorHex, accentColorHex) {
  // Front cover canvas
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 720);
  grad.addColorStop(0, baseColorHex);
  grad.addColorStop(1, '#080d1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 720);

  // Gilded borders
  ctx.strokeStyle = accentColorHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(26, 26, 512 - 52, 720 - 52);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, 512 - 72, 720 - 72);

  // Ornamental corner accents
  const corners = [
    [36, 36],
    [512 - 36, 36],
    [36, 720 - 36],
    [512 - 36, 720 - 36],
  ];
  ctx.fillStyle = accentColorHex;
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Top header label
  ctx.fillStyle = accentColorHex;
  ctx.font = '600 14px "Manrope", sans-serif';
  ctx.letterSpacing = '3px';
  ctx.textAlign = 'center';
  ctx.fillText('FOLIO CLUB SELECTION', 256, 100);

  // Ornamental seal
  ctx.beginPath();
  ctx.arc(256, 200, 52, 0, Math.PI * 2);
  ctx.strokeStyle = accentColorHex;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(256, 200);
  ctx.strokeStyle = accentColorHex;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-18, -18, 36, 36);
  }
  ctx.restore();

  // Book Title
  ctx.fillStyle = '#f8f4eb';
  ctx.font = 'bold 30px "EB Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 320);

  // Divider line
  ctx.strokeStyle = accentColorHex;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(150, 350);
  ctx.lineTo(362, 350);
  ctx.stroke();

  // Wrap quote text
  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY;
  }

  ctx.fillStyle = '#e2d9cc';
  ctx.font = 'italic 18px "EB Garamond", Georgia, serif';
  const endY = wrapText('“' + quoteText + '”', 256, 400, 420, 26);

  // Quote Author
  ctx.fillStyle = accentColorHex;
  ctx.font = 'bold 15px "Manrope", sans-serif';
  ctx.fillText('— ' + quoteAuthor, 256, endY + 36);

  // Spine Canvas
  const spineCanvas = document.createElement('canvas');
  spineCanvas.width = 128;
  spineCanvas.height = 720;
  const sCtx = spineCanvas.getContext('2d');
  sCtx.fillStyle = baseColorHex;
  sCtx.fillRect(0, 0, 128, 720);
  sCtx.strokeStyle = accentColorHex;
  sCtx.lineWidth = 3;
  sCtx.strokeRect(8, 8, 112, 704);
  sCtx.save();
  sCtx.translate(64, 360);
  sCtx.rotate(-Math.PI / 2);
  sCtx.fillStyle = '#f8f4eb';
  sCtx.font = 'bold 24px "EB Garamond", Georgia, serif';
  sCtx.textAlign = 'center';
  sCtx.fillText(title, 0, 8);
  sCtx.restore();

  const frontTex = new THREE.CanvasTexture(canvas);
  const spineTex = new THREE.CanvasTexture(spineCanvas);

  const pageMat = new THREE.MeshStandardMaterial({
    color: 0xf5ebd9,
    roughness: 0.9,
    metalness: 0.05,
  });
  const coverBackMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColorHex),
    roughness: 0.4,
    metalness: 0.1,
  });
  const coverFrontMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    roughness: 0.35,
    metalness: 0.15,
  });
  const spineMat = new THREE.MeshStandardMaterial({
    map: spineTex,
    roughness: 0.4,
    metalness: 0.1,
  });

  return {
    materials: [pageMat, spineMat, pageMat, pageMat, coverFrontMat, coverBackMat],
    textures: [frontTex, spineTex],
  };
}

export default function ThreeBookShowcase() {
  const containerRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setHasWebGL(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 520;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Responsive camera distance based on viewport width
    const updateCameraDistance = () => {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      if (isMobile) {
        camera.position.set(0, 0.4, 11.2);
      } else if (isTablet) {
        camera.position.set(0, 0.45, 9.2);
      } else {
        camera.position.set(0, 0.5, 7.8);
      }
    };
    updateCameraDistance();

    // WebGL Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setHasWebGL(false);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Warm Antiquarian Lighting
    const ambientLight = new THREE.AmbientLight(0xffecd1, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xd4a373, 2.5);
    keyLight.position.set(5, 7, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4a6fa5, 1.2);
    fillLight.position.set(-6, -2, -3);
    scene.add(fillLight);

    const goldRim = new THREE.PointLight(0xe8b86d, 3.0, 15);
    goldRim.position.set(0, 3, 3);
    scene.add(goldRim);

    // Books Creation
    const bookGeom = new THREE.BoxGeometry(2.0, 2.8, 0.45);
    const bookMeshes = [];
    const allTextures = [];
    const allMaterials = [];

    BOOKS_DATA.forEach((data, index) => {
      const { materials, textures } = createBookMaterials(
        data.title,
        data.author,
        data.quote,
        data.base,
        data.accent
      );
      allTextures.push(...textures);
      allMaterials.push(...materials);

      const book = new THREE.Mesh(bookGeom, materials);
      book.position.set(data.x, index === 1 ? 0.3 : 0.0, index === 1 ? 0.4 : 0.0);
      book.rotation.y = data.rotY;
      book.rotation.x = 0.08;
      book.castShadow = true;
      book.receiveShadow = true;
      book.userData = {
        ...data,
        initialY: book.position.y,
        initialX: data.x,
        initialRotY: data.rotY,
        index,
      };
      scene.add(book);
      bookMeshes.push(book);
    });

    // Pedestal Golden Halo Ring
    const ringGeom = new THREE.TorusGeometry(3.9, 0.02, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4a373,
      transparent: true,
      opacity: 0.4,
    });
    const haloRing = new THREE.Mesh(ringGeom, ringMat);
    haloRing.rotation.x = Math.PI / 2.2;
    haloRing.position.y = -1.6;
    scene.add(haloRing);

    // Floating Golden Dust Particles
    const particleCount = 80;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 14;
      positions[i + 1] = (Math.random() - 0.5) * 8;
      positions[i + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xd4a373,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // Interactive Coordinates
    let scrollProgress = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        scrollProgress = window.scrollY / totalScroll;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener('pointermove', handlePointerMove);

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || 520;
      camera.aspect = width / height;
      updateCameraDistance();
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Camera responds smoothly to mouse and scroll
      const isMobile = window.innerWidth < 768;
      const baseCamZ = isMobile ? 11.2 : window.innerWidth < 1024 ? 9.2 : 7.8;
      const targetCamX = mouseX * 0.8 + Math.sin(scrollProgress * Math.PI) * 1.5;
      const targetCamY = 0.5 + mouseY * 0.5 - scrollProgress * 1.2;

      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.position.z += (baseCamZ - camera.position.z) * 0.05;
      camera.lookAt(0, 0, 0);

      // Volumes float and rotate with scroll
      bookMeshes.forEach((book, i) => {
        const offset = i * 1.6;
        const scrollAngle = scrollProgress * Math.PI * 1.2;
        book.position.y =
          book.userData.initialY + Math.sin(elapsedTime * 1.3 + offset) * 0.12;
        book.rotation.y =
          book.userData.initialRotY +
          Math.cos(elapsedTime * 0.7 + offset) * 0.06 +
          mouseX * 0.18 +
          scrollAngle * (i === 0 ? 0.6 : i === 1 ? -0.4 : 0.8);
        book.rotation.z =
          Math.sin(elapsedTime * 0.8 + offset) * 0.025 + scrollProgress * 0.1;
      });

      haloRing.rotation.z = elapsedTime * 0.12 + scrollProgress * 2;
      particles.rotation.y = elapsedTime * 0.03 + scrollProgress * 0.5;

      renderer.render(scene, camera);
    };
    animate();

    // Proper Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', handlePointerMove);

      // Dispose Geometries
      bookGeom.dispose();
      ringGeom.dispose();
      particleGeom.dispose();

      // Dispose Textures
      allTextures.forEach((tex) => tex.dispose());

      // Dispose Materials
      allMaterials.forEach((mat) => mat.dispose());
      ringMat.dispose();
      particleMat.dispose();

      // Dispose Renderer & DOM
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full relative rounded-2xl bg-surface-container-lowest/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden p-2 border border-primary/15">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-surface-container-lowest/90 pointer-events-none z-20" />

      {/* Top Left Label */}
      <div className="absolute top-4 left-6 z-30 flex items-center gap-space-xs text-primary/80">
        <span className="material-symbols-outlined text-[16px] text-secondary">
          menu_book
        </span>
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
          Interactive Archival Folios
        </span>
      </div>

      {/* WebGL Canvas or CSS 3D Fallback */}
      {hasWebGL ? (
        <div
          ref={containerRef}
          className="w-full h-[380px] sm:h-[460px] lg:h-[520px] rounded-2xl bg-transparent relative z-10 my-4 cursor-grab active:cursor-grabbing"
          style={{ display: 'block', touchAction: 'none' }}
        />
      ) : (
        /* WebGL Fallback */
        <div className="w-full h-[520px] rounded-2xl relative z-10 my-4 flex items-center justify-center p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
            {BOOKS_DATA.map((book) => (
              <div
                key={book.title}
                className="rounded-xl p-6 border border-primary/30 flex flex-col justify-between shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${book.base}, #080d1a)`,
                }}
              >
                <div className="text-center">
                  <span
                    className="font-label-sm uppercase tracking-widest text-[11px]"
                    style={{ color: book.accent }}
                  >
                    Folio Selection
                  </span>
                  <h4 className="font-headline-md text-headline-md text-on-surface mt-2 font-bold font-garamond">
                    {book.title}
                  </h4>
                  <div
                    className="w-12 h-0.5 mx-auto my-3"
                    style={{ backgroundColor: book.accent }}
                  />
                  <p className="font-body-sm text-body-sm text-on-surface-variant italic font-garamond leading-relaxed">
                    “{book.quote}”
                  </p>
                </div>
                <div
                  className="text-center mt-4 font-bold text-xs"
                  style={{ color: book.accent }}
                >
                  — {book.author}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Hint Prompt */}
      <div className="absolute bottom-4 inset-x-0 mx-auto w-fit z-30 flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-highest/80 backdrop-blur-sm text-on-surface-variant font-label-sm text-label-sm tracking-wide shadow-md border border-outline-variant/30">
        <span className="text-secondary">✦</span>
        <span>Scroll page or hover to rotate volumes &amp; reveal chapter quotes</span>
      </div>
    </div>
  );
}
