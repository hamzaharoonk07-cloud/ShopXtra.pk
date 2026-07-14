(function () {
  if (typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const mount = document.getElementById('hero-3d');
  if (!mount) return;

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vNoise;
    uniform float uTime;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      float n = snoise(position * 1.1 + uTime * 0.15);
      vNoise = n;
      vec3 displaced = position + normal * n * 0.11;

      vec3 tangent = normalize(cross(normal, vec3(0.0, 1.0, 0.0) + vec3(0.0001)));
      vec3 bitangent = normalize(cross(normal, tangent));
      float eps = 0.02;
      float n2 = snoise((position + tangent * eps) * 1.1 + uTime * 0.15);
      float n3 = snoise((position + bitangent * eps) * 1.1 + uTime * 0.15);
      vec3 p2 = position + tangent * eps + normal * n2 * 0.11;
      vec3 p3 = position + bitangent * eps + normal * n3 * 0.11;
      vec3 newNormal = normalize(cross(p2 - displaced, p3 - displaced));

      vNormal = normalize(normalMatrix * newNormal);
      vPosition = (modelViewMatrix * vec4(displaced, 1.0)).xyz;
      gl_Position = projectionMatrix * vec4(vPosition, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vNoise;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      vec3 lightDir = normalize(vec3(0.6, 0.8, 1.0));
      vec3 normal = normalize(vNormal);

      float diff = max(dot(normal, lightDir), 0.0);
      float half1 = max(dot(normal, normalize(lightDir + viewDir)), 0.0);
      float spec = pow(half1, 28.0) * 0.5;
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.8);

      vec3 base = mix(uColorA, uColorB, smoothstep(-0.5, 0.6, vNoise));
      vec3 lit = base * (0.45 + diff * 0.75);
      vec3 color = mix(lit, uColorC, fresnel * 0.85);
      color += vec3(1.0) * spec;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const width = mount.clientWidth;
  const height = mount.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.z = 4.2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  mount.appendChild(renderer.domElement);

  const geometry = new THREE.IcosahedronGeometry(1.5, 32);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#1C231D') },
      uColorB: { value: new THREE.Color('#C9A24D') },
      uColorC: { value: new THREE.Color('#5F9B3A') },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(3, 3, 3);
  scene.add(light);

  let targetX = 0, targetY = 0;
  mount.addEventListener('mousemove', (e) => {
    const rect = mount.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.6;
  });

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    mesh.rotation.y += 0.0025;
    mesh.rotation.x += (targetY - mesh.rotation.x) * 0.03;
    mesh.rotation.y += (targetX - mesh.rotation.y * 0.02) * 0.01;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener('resize', () => {
    const w = mount.clientWidth, h = mount.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();
