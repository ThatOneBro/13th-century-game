/*
 * TinyCanvas module (https://github.com/bitnenfer/tiny-canvas)
 * Developed by Felipe Alfonso -> https://twitter.com/bitnenfer/
 * Converted to TS by Derrick Farris -> https://twitter.com/ThatOneBrah
 *
 *  ----------------------------------------------------------------------
 *
 *             DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                     Version 2, December 2004
 *
 *  Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>
 *
 *  Everyone is permitted to copy and distribute verbatim or modified
 *  copies of this license document, and changing it is allowed as long
 *  as the name is changed.
 *
 *             DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *    TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION
 *
 *   0. You just DO WHAT THE FUCK YOU WANT TO.
 *
 *  ----------------------------------------------------------------------
 *
 */

type WebGLTextureType = WebGLTexture & {
  width: number;
  height: number;
};

type Renderer = {
  g: WebGL2RenderingContext;
  c: HTMLCanvasElement;
  col: number;
  bkg: (r: number, g: number, b: number) => void;
  cls: () => void;
  trans: (x: number, y: number) => void;
  scale: (x: number, y: number) => void;
  rot: (r: number) => void;
  push: () => void;
  pop: () => void;
  img: (
    texture: WebGLTextureType,
    x: number,
    y: number,
    w: number,
    h: number,
    u0: number,
    v0: number,
    u1: number,
    v1: number,
  ) => void;
  flush: () => void;
};

function CompileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return shader;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function CreateShaderProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
  const program = gl.createProgram(),
    vShader = CompileShader(gl, vsSource, 35633),
    fShader = CompileShader(gl, fsSource, 35632);
  if (!program || !vShader || !fShader) return null;
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  return program;
}

function CreateBuffer(
  gl: WebGL2RenderingContext,
  bufferType: GLenum,
  size: GLsizeiptr,
  usage: GLenum,
): WebGLBuffer | null {
  const buffer = gl.createBuffer();
  if (!buffer) return buffer;
  gl.bindBuffer(bufferType, buffer);
  gl.bufferData(bufferType, size, usage);
  return buffer;
}

function CreateTexture(
  gl: WebGL2RenderingContext,
  image: TexImageSource,
  width: number,
  height: number,
): WebGLTextureType | null {
  const texture = gl.createTexture() as WebGLTextureType;
  if (!texture) return texture;
  gl.bindTexture(3553, texture);
  gl.texParameteri(3553, 10242, 33071);
  gl.texParameteri(3553, 10243, 33071);
  gl.texParameteri(3553, 10240, 9728);
  gl.texParameteri(3553, 10241, 9728);
  gl.texImage2D(3553, 0, 6408, 6408, 5121, image);
  gl.bindTexture(3553, null);
  texture.width = width;
  texture.height = height;
  return texture;
}

function TinyCanvas(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl2");
  const VERTEX_SIZE = 4 * 2 + 4 * 2 + 4;
  const MAX_BATCH = 10922; // floor((2 ^ 16) / 6)
  // const MAX_STACK = 100;
  // const MAT_SIZE = 6;
  const VERTICES_PER_QUAD = 6;
  // const MAT_STACK_SIZE = MAX_STACK * MAT_SIZE;
  const VERTEX_DATA_SIZE = VERTEX_SIZE * MAX_BATCH * 4;
  const INDEX_DATA_SIZE = MAX_BATCH * (2 * VERTICES_PER_QUAD);

  const width = canvas.width;
  const height = canvas.height;
  if (!gl) return gl;

  const shader = CreateShaderProgram(
    gl,
    [
      "precision lowp float;",
      // IN Vertex Position and
      // IN Texture Coordinates
      "attribute vec2 a, b;",
      // IN Vertex Color
      "attribute vec4 c;",
      // OUT Texture Coordinates
      "varying vec2 d;",
      // OUT Vertex Color
      "varying vec4 e;",
      // CONST View Matrix
      "uniform mat4 m;",
      "uniform vec2 r;",
      "void main(){",
      "gl_Position=m*vec4(a,1.0,1.0);",
      "d=b;",
      "e=c;",
      "}",
    ].join("\n"),
    [
      "precision lowp float;",
      // OUT Texture Coordinates
      "varying vec2 d;",
      // OUT Vertex Color
      "varying vec4 e;",
      // CONST Single Sampler2D
      "uniform sampler2D f;",
      "void main(){",
      "gl_FragColor=texture2D(f,d)*e;",
      "}",
    ].join("\n"),
  );

  if (!shader) return shader;

  const cos = Math.cos;
  const sin = Math.sin;

  const glBufferSubData = gl.bufferSubData.bind(gl);
  const glDrawElements = gl.drawElements.bind(gl);
  const glBindTexture = gl.bindTexture.bind(gl);
  const glClear = gl.clear.bind(gl);
  const glClearColor = gl.clearColor.bind(gl);
  const vertexData = new ArrayBuffer(VERTEX_DATA_SIZE);
  const vPositionData = new Float32Array(vertexData);
  const vColorData = new Uint32Array(vertexData);
  const vIndexData = new Uint16Array(INDEX_DATA_SIZE);
  const IBO = CreateBuffer(gl, 34963, vIndexData.byteLength, 35044);
  const VBO = CreateBuffer(gl, 34962, vertexData.byteLength, 35048);

  const mat = new Float32Array([1, 0, 0, 1, 0, 0]);
  const stack = new Float32Array(100);

  let stackp = 0;
  let count = 0;
  let currentTexture: WebGLTextureType | null = null;

  gl.blendFunc(770, 771);
  gl.enable(3042);
  gl.useProgram(shader);
  gl.bindBuffer(34963, IBO);

  let indexB;
  for (let indexA = (indexB = 0); indexA < MAX_BATCH * VERTICES_PER_QUAD; indexA += VERTICES_PER_QUAD, indexB += 4)
    (vIndexData[indexA + 0] = indexB),
      (vIndexData[indexA + 1] = indexB + 1),
      (vIndexData[indexA + 2] = indexB + 2),
      (vIndexData[indexA + 3] = indexB + 0),
      (vIndexData[indexA + 4] = indexB + 3),
      (vIndexData[indexA + 5] = indexB + 1);

  glBufferSubData(34963, 0, vIndexData);
  gl.bindBuffer(34962, VBO);

  const locA = gl.getAttribLocation(shader, "a");
  const locB = gl.getAttribLocation(shader, "b");
  const locC = gl.getAttribLocation(shader, "c");

  gl.enableVertexAttribArray(locA);
  gl.vertexAttribPointer(locA, 2, 5126, false, VERTEX_SIZE, 0);
  gl.enableVertexAttribArray(locB);
  gl.vertexAttribPointer(locB, 2, 5126, false, VERTEX_SIZE, 8);
  gl.enableVertexAttribArray(locC);
  gl.vertexAttribPointer(locC, 4, 5121, true, VERTEX_SIZE, 16);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(shader, "m"),
    false,
    new Float32Array([2 / width, 0, 0, 0, 0, -2 / height, 0, 0, 0, 0, 1, 1, -1, 1, 0, 0]),
  );
  gl.activeTexture(33984);

  const renderer = {
    g: gl,
    c: canvas,
    col: 0xffffffff,
    bkg: function (r: number, g: number, b: number) {
      glClearColor(r, g, b, 1);
    },
    cls: function () {
      glClear(16384);
    },
    trans: function (x: number, y: number) {
      mat[4] = mat[0] * x + mat[2] * y + mat[4];
      mat[5] = mat[1] * x + mat[3] * y + mat[5];
    },
    scale: function (x: number, y: number) {
      mat[0] = mat[0] * x;
      mat[1] = mat[1] * x;
      mat[2] = mat[2] * y;
      mat[3] = mat[3] * y;
    },
    rot: function (r: number) {
      const a = mat[0],
        b = mat[1],
        c = mat[2],
        d = mat[3],
        sr = sin(r),
        cr = cos(r);

      mat[0] = a * cr + c * sr;
      mat[1] = b * cr + d * sr;
      mat[2] = a * -sr + c * cr;
      mat[3] = b * -sr + d * cr;
    },
    push: function () {
      stack[stackp + 0] = mat[0];
      stack[stackp + 1] = mat[1];
      stack[stackp + 2] = mat[2];
      stack[stackp + 3] = mat[3];
      stack[stackp + 4] = mat[4];
      stack[stackp + 5] = mat[5];
      stackp += 6;
    },
    pop: function () {
      stackp -= 6;
      mat[0] = stack[stackp + 0];
      mat[1] = stack[stackp + 1];
      mat[2] = stack[stackp + 2];
      mat[3] = stack[stackp + 3];
      mat[4] = stack[stackp + 4];
      mat[5] = stack[stackp + 5];
    },
    img: function (
      texture: WebGLTextureType,
      x: number,
      y: number,
      w: number,
      h: number,
      u0: number,
      v0: number,
      u1: number,
      v1: number,
    ) {
      const x0 = x,
        y0 = y,
        x1 = x + w,
        y1 = y + h,
        x2 = x,
        y2 = y + h,
        x3 = x + w,
        y3 = y,
        a = mat[0],
        b = mat[1],
        c = mat[2],
        d = mat[3],
        e = mat[4],
        f = mat[5],
        argb = renderer.col;

      let offset = 0;

      if (texture != currentTexture || count + 1 >= MAX_BATCH) {
        glBufferSubData(34962, 0, vertexData);
        glDrawElements(4, count * VERTICES_PER_QUAD, 5123, 0);
        count = 0;
        if (currentTexture != texture) {
          currentTexture = texture;
          glBindTexture(3553, currentTexture);
        }
      }

      offset = count * VERTEX_SIZE;
      // Vertex Order
      // Vertex Position | UV | ARGB
      // Vertex 1
      vPositionData[offset++] = x0 * a + y0 * c + e;
      vPositionData[offset++] = x0 * b + y0 * d + f;
      vPositionData[offset++] = u0;
      vPositionData[offset++] = v0;
      vColorData[offset++] = argb;

      // Vertex 2
      vPositionData[offset++] = x1 * a + y1 * c + e;
      vPositionData[offset++] = x1 * b + y1 * d + f;
      vPositionData[offset++] = u1;
      vPositionData[offset++] = v1;
      vColorData[offset++] = argb;

      // Vertex 3
      vPositionData[offset++] = x2 * a + y2 * c + e;
      vPositionData[offset++] = x2 * b + y2 * d + f;
      vPositionData[offset++] = u0;
      vPositionData[offset++] = v1;
      vColorData[offset++] = argb;

      // Vertex 4
      vPositionData[offset++] = x3 * a + y3 * c + e;
      vPositionData[offset++] = x3 * b + y3 * d + f;
      vPositionData[offset++] = u1;
      vPositionData[offset++] = v0;
      vColorData[offset++] = argb;

      if (++count >= MAX_BATCH) {
        glBufferSubData(34962, 0, vertexData);
        glDrawElements(4, count * VERTICES_PER_QUAD, 5123, 0);
        count = 0;
      }
    },
    flush: function () {
      if (count == 0) return;
      glBufferSubData(34962, 0, vPositionData.subarray(0, count * VERTEX_SIZE));
      glDrawElements(4, count * VERTICES_PER_QUAD, 5123, 0);
      count = 0;
    },
  } satisfies Renderer;
  return renderer;
}

export const TCShd = CompileShader;
export const TCPrg = CreateShaderProgram;
export const TCBuf = CreateBuffer;
export const TCTex = CreateTexture;
export const TC = TinyCanvas;
