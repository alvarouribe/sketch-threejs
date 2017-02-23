import normalizeVector2 from '../modules/common/normalizeVector2';
import PhysicsRenderer from '../modules/common/PhysicsRenderer';

const debounce = require('js-util/debounce');

export default function() {
  const canvas = document.getElementById('canvas-webgl');
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    canvas: canvas,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, document.body.clientWidth / window.innerHeight, 1, 10000);
  const clock = new THREE.Clock();

  const vectorTouchStart = new THREE.Vector2();
  const vectorTouchMove = new THREE.Vector2();
  const vectorTouchEnd = new THREE.Vector2();
  let isDrag = false;

  //
  // process for this sketch.
  //

  const glslify = require('glslify');

  class OctahedronPoints {
    constructor() {
      this.uniforms = {
        time: {
          type: 'f',
          value: 0
        },
        velocity: {
          type: 't',
          value: null
        },
        acceleration: {
          type: 't',
          value: null
        }
      };
      this.physicsRenderer = null;
      this.vectorTouchMove = new THREE.Vector2(0, 0);
      this.vectorTouchMoveDiff = new THREE.Vector2(0, 0);
      this.obj = this.createObj();
    }
    createObj() {
      const detail = (window.innerWidth > 768) ? 7 : 6;
      const geometry = new THREE.OctahedronBufferGeometry(400, detail);
      const verticesBase = geometry.attributes.position.array;
      const vertices = [];
      for (var i = 0; i < verticesBase.length; i+= 3) {
        vertices[i + 0] = verticesBase[i + 0] + (Math.random() * 2 - 1) * 400;
        vertices[i + 1] = verticesBase[i + 1] + (Math.random() * 2 - 1) * 400;
        vertices[i + 2] = verticesBase[i + 2] + (Math.random() * 2 - 1) * 400;
      }
      this.physicsRenderer = new PhysicsRenderer(
        glslify('../../glsl/sketch/particle/physicsRendererAcceleration.vs'),
        glslify('../../glsl/sketch/particle/physicsRendererAcceleration.fs'),
        glslify('../../glsl/sketch/particle/physicsRendererVelocity.vs'),
        glslify('../../glsl/sketch/particle/physicsRendererVelocity.fs')
      );
      this.physicsRenderer.init(renderer, vertices);
      this.physicsRenderer.mergeAUniforms({
        vTouchMove: {
          type: 'v2',
          value: this.vectorTouchMoveDiff
        }
      });
      this.uniforms.velocity.value = this.physicsRenderer.getCurrentVelocity();
      this.uniforms.acceleration.value = this.physicsRenderer.getCurrentAcceleration();
      geometry.addAttribute('uvVelocity', this.physicsRenderer.getBufferAttributeUv());
      return new THREE.Points(
        geometry,
        new THREE.RawShaderMaterial({
          uniforms: this.uniforms,
          vertexShader: glslify('../../glsl/sketch/particle/OctahedronPoints.vs'),
          fragmentShader: glslify('../../glsl/sketch/particle/octahedronPoints.fs'),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    }
    render(time) {
      this.physicsRenderer.render(renderer, time);
      this.uniforms.time.value += time;
    }
    touchStart(v) {
      this.vectorTouchMove.copy(v);
    }
    touchMove(v) {
      this.vectorTouchMoveDiff.set(
        v.x - this.vectorTouchMove.x,
        v.y - this.vectorTouchMove.y
      );
      this.vectorTouchMove.copy(v);
    }
    touchEnd() {
      this.vectorTouchMove.set(0, 0);
      this.vectorTouchMoveDiff.set(0, 0);
    }
  }
  const points = new OctahedronPoints();

  //
  // common process
  //
  const resizeWindow = () => {
    canvas.width = document.body.clientWidth;
    canvas.height = window.innerHeight;
    camera.aspect = document.body.clientWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(document.body.clientWidth, window.innerHeight);
  }
  const render = () => {
    const time = clock.getDelta();
    points.render(time);
    renderer.render(scene, camera);
  }
  const renderLoop = () => {
    render();
    requestAnimationFrame(renderLoop);
  }
  const touchStart = (isTouched) => {
    isDrag = true;
    points.touchStart(vectorTouchStart);
  };
  const touchMove = (isTouched) => {
    if (isDrag) points.touchMove(vectorTouchMove);
  };
  const touchEnd = (isTouched) => {
    isDrag = false;
    points.touchEnd();
  };
  const mouseOut = () => {
    isDrag = false;
    points.touchEnd();
  };
  const on = () => {
    window.addEventListener('resize', debounce(() => {
      resizeWindow();
    }), 1000);
    canvas.addEventListener('mousedown', function (event) {
      event.preventDefault();
      vectorTouchStart.set(event.clientX, event.clientY);
      normalizeVector2(vectorTouchStart);
      touchStart(false);
    });
    canvas.addEventListener('mousemove', function (event) {
      event.preventDefault();
      vectorTouchMove.set(event.clientX, event.clientY);
      normalizeVector2(vectorTouchMove);
      touchMove(false);
    });
    canvas.addEventListener('mouseup', function (event) {
      event.preventDefault();
      vectorTouchEnd.set(event.clientX, event.clientY);
      normalizeVector2(vectorTouchEnd);
      touchEnd(false);
    });
    canvas.addEventListener('touchstart', function (event) {
      event.preventDefault();
      vectorTouchStart.set(event.touches[0].clientX, event.touches[0].clientY);
      normalizeVector2(vectorTouchStart);
      touchStart(event.touches[0].clientX, event.touches[0].clientY, true);
    });
    canvas.addEventListener('touchmove', function (event) {
      event.preventDefault();
      vectorTouchMove.set(event.touches[0].clientX, event.touches[0].clientY);
      normalizeVector2(vectorTouchMove);
      touchMove(true);
    });
    canvas.addEventListener('touchend', function (event) {
      event.preventDefault();
      normalizeVector2(vectorTouchEnd);
      vectorTouchEnd.set(event.changedTouches[0].clientX, event.changedTouches[0].clientY);
      touchEnd(true);
    });
    window.addEventListener('mouseout', function () {
      event.preventDefault();
      vectorTouchEnd.set(0, 0);
      mouseOut();
    });
  }

  const init = () => {
    renderer.setSize(document.body.clientWidth, window.innerHeight);
    renderer.setClearColor(0x111111, 1.0);
    camera.position.set(0, 0, 1000);
    camera.lookAt(new THREE.Vector3());

    scene.add(points.obj);

    on();
    resizeWindow();
    renderLoop();
  }
  init();
}