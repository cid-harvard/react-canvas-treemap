import {
  failIfValidOrNonExhaustive,
} from './Utils';

export enum UpdateType {
  Enter = 'Enter',
  Exit = 'Exit',
  Update = 'Update',
}

/* tslint:disable:max-classes-per-file interface-name */
/* tslint:disable:interface-name */
// Note: every item of `T` needs to be JSON-serializable
export class PersistentArray<T> {
  data: T[];
  length: number;
  constructor(public maxLength: number, initialItem: T) {
    const stringifiedInitialItem = JSON.stringify(initialItem);
    const initialData: T[] = [];
    for (let i = 0; i < maxLength; i += 1) {
      const item: T = JSON.parse(stringifiedInitialItem);
      initialData.push(item);
    }
    this.length = maxLength;
    this.data = initialData;
  }

  // Returns the portion of the array that contains valid information i.e.
  // excluding "zeros" between `this.length` and `this.maxLength`:
  getMeaningfulData() {
    return this.data.slice(0, this.length);
  }
}

// an array that's intended to not be garbage-collected:
export class PersistentFloat32Array {
  buffer: Float32Array;
  length: number;

  constructor(public maxLength: number) {
    this.buffer = new Float32Array(maxLength);
    this.length = maxLength;
  }

  // Return the portion of the buffer that contains meaningfully assigned data
  // (the size of the array buffer is pre-allocated to be always larger than the
  // size of the actual data it contains).
  getMeaningfulData(): Float32Array {
    return this.buffer.subarray(0, this.length);
  }

  // Copy data from another array ("they") of shorter length into this instance ("we"):
  copyFrom(they: PersistentFloat32Array) {
    const {length: theirLength, buffer: theirBuffer} = they;
    const {length: ourLength, buffer: ourBuffer} = this;
    if (theirLength > ourLength) {
      throw new Error('Not enough space in our array to accommodate data from their array');
    }
    for (let i = 0; i < theirLength; i += 1) {
      ourBuffer[i] = theirBuffer[i];
    }
  }
}

//#region Type definitions for WebGL extensions
export interface WebGLTimerQueryEXT {
  // Fake property to make this type unique:
  __dummyWebGLTimerQueryEXT: number;
}

export interface EXTDisjointTimerQuery {
  readonly TIME_ELAPSED_EXT: number;
  readonly QUERY_COUNTER_BITS_EXT: number;
  readonly CURRENT_QUERY_EXT: number;
  readonly QUERY_RESULT_EXT: number;
  readonly QUERY_RESULT_AVAILABLE_EXT: number;
  readonly TIMESTAMP_EXT: number;
  readonly GPU_DISJOINT_EXT: number;

  createQueryEXT(): WebGLTimerQueryEXT;
  beginQueryEXT(num: EXTDisjointTimerQuery['TIME_ELAPSED_EXT'], query: WebGLTimerQueryEXT): void;
  endQueryEXT(target: number): void;
  getQueryObjectEXT(query: WebGLTimerQueryEXT, pname: number): any;
}

export interface OESElementIndexUint {
  __dummyOESElementIndexUint: number;
}

export interface ANGLEInstancedArrays {
  readonly VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: number;
  drawArraysInstancedANGLE(mode: number, first: number, count: number, primcount: number): void;
  drawElementsInstancedANGLE(mode: number, count: number, type: number, offset: number, primcount: number): void;
  vertexAttribDivisorANGLE(index: number, divisor: number): void;
}

interface WebGLQuery {
  // Fake property to make this type unique:
  __dummyWebGLQuery: number;
}

export interface EXT_disjoint_timer_query_webgl2 {
  readonly QUERY_COUNTER_BITS_EXT: number;
  readonly TIME_ELAPSED_EXT: number;
  readonly TIMESTAMP_EXT: number;
  readonly GPU_DISJOINT_EXT: number;
  queryCounterEXT(query: WebGLQuery, target: number): void;
  beginQuery(target: number, query?: WebGLQuery): void;
  endQuery(target: number): void;
}

declare global {
  interface WebGLRenderingContextBase {
    getExtension(name: 'EXT_disjoint_timer_query'): EXTDisjointTimerQuery | null;
  }

  interface WebGL2RenderingContext extends WebGLRenderingContext {
    // VAO extension:
    createVertexArray: OES_vertex_array_object['createVertexArrayOES'];
    deleteVertexArray: OES_vertex_array_object['deleteVertexArrayOES'];
    isVertexArray: OES_vertex_array_object['isVertexArrayOES'];
    bindVertexArray: OES_vertex_array_object['bindVertexArrayOES'];

    // Instanced drawing extension:
    drawArraysInstanced: ANGLE_instanced_arrays['drawArraysInstancedANGLE'];
    drawElementsInstanced: ANGLE_instanced_arrays['drawElementsInstancedANGLE'];
    vertexAttribDivisor: ANGLE_instanced_arrays['vertexAttribDivisorANGLE'];

    // Uniform buffer object:
    getUniformBlockIndex(program: WebGLProgram, uniformBlockName: string): number;
    uniformBlockBinding(program: WebGLProgram, uniformBlockIndex: number, uniformBlockBinding: number): void;
    bindBufferBase(target: number, index: number, buffer: WebGLBuffer): void;
    readonly UNIFORM_BUFFER: number;

    // Query related:
    createQuery(): WebGLQuery;
    beginQuery(target: number, query: WebGLQuery): void;
    endQuery(target: number): WebGLQuery;
    getQueryParameter(query: WebGLQuery, pname: number): any;
    readonly QUERY_RESULT_AVAILABLE: number;
    readonly QUERY_RESULT: number;
  }

  interface HTMLCanvasElement {
    getContext(contextId: 'webgl2', contextAttributes?: WebGLContextAttributes): WebGL2RenderingContext | null;
  }
}
//#endregion
/* tslint:enable:interface-name */

export type ColorTriplet = [number, number, number];
export type ColorQuadruplet = [number, number, number, number];

export const normalizeColorTriplet = (unnormalized: ColorTriplet): ColorTriplet => ([
  unnormalized[0] / 255, unnormalized[1] / 255, unnormalized[2] / 255,
]);
export const normalizeColorQuadruplet = (unnormalized: ColorQuadruplet): ColorQuadruplet => ([
  unnormalized[0] / 255, unnormalized[1] / 255, unnormalized[2] / 255, unnormalized[3] / 255,
]);

export const colorTripletToCSSString = (color: ColorTriplet) => `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

export interface IUpdatePatternItem {
  key: string;
  type: UpdateType;
}

// Adapted from
// tslint:disable-next-line:max-line-length
// https://github.com/reactjs/react-transition-group/blob/153d56299903c1d9b85987948dfb410e0e0562e5/src/utils/ChildMapping.js#L39-L83
export const getUpdatePattern = (prevKeys: string[], nextKeys: string[]) => {
  const prevKeysSet = new Set(prevKeys);
  const nextKeysSet = new Set(nextKeys);

  const getUpdateType = (key: string) => {
    const inPrev = prevKeysSet.has(key);
    const inNext = nextKeysSet.has(key);
    if (inPrev === true && inNext === true) {
      return UpdateType.Update;
    } else if (inPrev === true) {
      return UpdateType.Exit;
    } else {
      return UpdateType.Enter;
    }
  };

  const prevKeysLength = prevKeys.length;
  const nextKeysLength = nextKeys.length;

  const prevKeysPending = new Map<string, string[]>();

  let pendingKeys: string[] = [];

  let i = 0;
  for (i = 0; i < nextKeysLength; i += 1) {
    const nextKey = nextKeys[i];
    if (prevKeysSet.has(nextKey)) {
      if (pendingKeys.length > 0) {
        prevKeysPending.set(nextKey, pendingKeys);
        pendingKeys = [];
      }
    } else {
      pendingKeys.push(nextKey);
    }
  }

  if (pendingKeys.length > 0) {
    const lastPendingKey = pendingKeys[pendingKeys.length - 1];
    const index = nextKeys.findIndex(elem => elem === lastPendingKey);
    if (index < nextKeysLength - 1) {
      const nextKey = nextKeys[i];
      prevKeysPending.set(nextKey, pendingKeys);
      pendingKeys = [];
    }
  }

  const childMapping: Map<string, UpdateType> = new Map();

  for (let j = 0; j < prevKeysLength; j += 1) {
    const prevKey = prevKeys[j];
    const retrievedPrevKeysPending = prevKeysPending.get(prevKey);

    if (retrievedPrevKeysPending !== undefined) {
      const retrievedPrevKeyPendingLength = retrievedPrevKeysPending.length;
      for (let k = 0; k < retrievedPrevKeyPendingLength; k += 1) {
        const pendingPrevKey = retrievedPrevKeysPending[k];
        childMapping.set(pendingPrevKey, getUpdateType(pendingPrevKey));
      }
    }
    childMapping.set(prevKey, getUpdateType(prevKey));

  }

  const pendingKeysLength = pendingKeys.length;
  for (let m = 0; m < pendingKeysLength; m += 1) {
    const retrievedPendingKey = pendingKeys[m];
    childMapping.set(retrievedPendingKey, getUpdateType(retrievedPendingKey));
  }

  const result: IUpdatePatternItem[] = [];
  for (const [key, type] of (childMapping as any)) {
    result.push({key, type});
  }

  return result;
};

export const resizeViewport = (gl: WebGLRenderingContext, shouldResizeCanvas: boolean) => {
  const pixelRatio = window.devicePixelRatio;
  const canvas = gl.canvas;

  const displayWidth = Math.floor((canvas as any).clientWidth * pixelRatio);
  const displayHeight = Math.floor((canvas as any).clientHeight * pixelRatio);

  if (shouldResizeCanvas === true) {
    if (canvas.width !== displayWidth ||
        canvas.height !== displayHeight) {

        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
  }

  gl.viewport(0, 0, canvas.width, canvas.height);

};

export const compileShader = (
    gl: WebGLRenderingContext, shaderSource: string, shaderType: number,
  ): WebGLShader => {

  const shader = gl.createShader(shaderType);
  if (shader === null) {
    throw new Error('Cannot create shader');
  }
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (process.env.NODE_ENV !== 'production') {
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    } else {
      throw new Error('Could not compile shader' + gl.getShaderInfoLog(shader));
    }
  }

  return shader;

};

export const createProgram = (
    gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader,
  ): WebGLProgram => {

  const program = gl.createProgram();
  if (program === null) {
    throw new Error('Cannot create program');
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (process.env.NODE_ENV !== 'production') {
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);

    if (success) {
      return program;
    } else {
      throw new Error('Program failed to link: ' + gl.getProgramInfoLog(program));
    }
  }

  return program;
};

export const createProgramFromShaderSource = (
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
  ): WebGLProgram => {

  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
  const program = createProgram(gl, vertexShader, fragmentShader);
  return program;
};

export const sendAttributesToGPUWithVAO = (input: {
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    programInfo: IProgramInfo,
    attributeName: string,
    data: Float32Array,
  }) => {

  const {
    gl, data, attributeName,
    programInfo: {attributes},
  } = input;

  const info = attributes[attributeName];
  const buffer = info.buffer;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
};

export const updateGLBuffer = (input: {
  gl: WebGLRenderingContext,
  data: Float32Array,
  buffer: WebGLBuffer,
}) => {

  const gl = input.gl;
  const buffer = input.buffer;
  const data = input.data;

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
};

export const updateUniformBuffer = (input: {
    gl: WebGL2RenderingContext,
    data: Float32Array,
    buffer: WebGLBuffer,
  }) => {

  const gl = input.gl;
  const buffer = input.buffer;
  const data = input.data;

  gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
};

export const sendIndicesToGPUWithVAO = (input: {
    gl: WebGLRenderingContext,
    programInfo: IProgramInfo
    data: Uint16Array | Uint32Array,
  }) => {

  const {
    gl, data,
    programInfo: {indexBuffer},
  } = input;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
  gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, data);
};

// There are 4 bytes in a 32-bit float:
export const GL_NUM_BYTES_PER_FLOAT = Float32Array.BYTES_PER_ELEMENT;

interface IAttributeInfo {
  location: number;
  buffer: WebGLBuffer;
  numFloatsPerVertex: number;
  stride: number; // in bytes
  offset: number; // in bytes
}

// Whether the index buffer allows 16-bit or 32-bit elements:
export enum IndexElementType {
  Int16,
  Int32,
}

type IIndexBufferInfo = {
  buffer: WebGLBuffer;
  // Either gl.UNSIGNED_SHORT (16 bit) or gl.UNSIGNED_INT (32 bit)
  elementType: number;
};

interface IUniformBlockInfo {
  buffer: WebGLBuffer;
}

export type IProgramInfo = {
  program: WebGLProgram;
  attributes: Record<string, IAttributeInfo>;
  uniforms: Record<string, WebGLUniformLocation>;
  indexBuffer: IIndexBufferInfo;
} & (
  {version: WebGLVersion.One} |
  {version: WebGLVersion.Two; uniformBlocks: Record<string, IUniformBlockInfo>}
);

// `Implicit` means we let WebGL assign the attribute location automatically.
// `Explicit` means we manually assign a location:
export enum AttributeLocationRequestType {
  Implicit,
  Explicit,
}

export enum AttributeBufferRequestType {
  Implicit,
  Explicit,
}

type AttributeBufferRequest = {
  type: AttributeBufferRequestType.Implicit
  totalSizeAsNumOfFloats: number; // Max num of floats that can fit into this buffer.
} | {
  type: AttributeBufferRequestType.Explicit;
  buffer: WebGLBuffer;
};

export interface IAttributeRequest {
  name: string;
  // How many floats should be pulled out of this buffer per vertex
  // e.g. if the attribute is a `vec2`, this number shoudl be 2:
  numFloatsPerVertex: number;
  stride: number; // in bytes
  offset: number; // in bytes
  buffer: AttributeBufferRequest;
  isInstanced: boolean;
}

export interface IIndexRequest {
  // Max size of integers (16 or 32 bit) that can fit into the buffer:
  totalSizeAsNumOfInts: number;
  elementType: IndexElementType;
}

export const createPopulatedGLBuffer = (
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    bufferData: PersistentFloat32Array) => {
  const buffer = gl.createBuffer();
  if (buffer === null) {
    throw new Error('Cannot create WebGL buffer');
  }

  const bindBuffer = (bufferDataToBind: PersistentFloat32Array) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, bufferDataToBind.buffer, gl.STATIC_DRAW);
  };
  bindBuffer(bufferData);

  return {
    buffer,
    rebindBuffer: bindBuffer,
  };
};

export enum WebGLVersion {
  One,
  Two,
}

export interface IUniformBlockRequest {
  name: string;
  assignedBlockIndex: number;
  assignedBuffer: WebGLBuffer;
}

type GetProgramInfoInput = {
  vertexShader: string,
  fragmentShader: string,
  attributes: IAttributeRequest[],
  uniforms: string[],
  indexBuffer: IIndexRequest,
  vaoObject: WebGLVertexArrayObjectOES,
} & (
  {
    version: WebGLVersion.One,
    gl: WebGLRenderingContext,
    vaoExtension: OES_vertex_array_object,
    instancedDrawingExtension: ANGLE_instanced_arrays,
  } | {
    version: WebGLVersion.Two,
    gl: WebGL2RenderingContext,
    uniformBlocks: IUniformBlockRequest[];
  }
);

export const getProgramInfo = (input: GetProgramInfoInput): IProgramInfo => {

  const {
    gl, vertexShader, fragmentShader, attributes, uniforms, indexBuffer,
  } = input;

  const program = createProgramFromShaderSource(gl, vertexShader, fragmentShader);

  if (input.version === WebGLVersion.One) {
    input.vaoExtension.bindVertexArrayOES(input.vaoObject);
  } else if (input.version === WebGLVersion.Two) {
    input.gl.bindVertexArray(input.vaoObject);
  } else {
    failIfValidOrNonExhaustive(input, 'Invalid version');
  }

  // Pre-allocate buffer size for attributes:
  const attributeInfo: Record<string, IAttributeInfo> = {};
  for (const attributeRequest of attributes) {
    const attributeName = attributeRequest.name;
    const location = input.gl.getAttribLocation(program, attributeName);

    const bufferRequest = attributeRequest.buffer;
    let buffer: WebGLBuffer;
    if (bufferRequest.type === AttributeBufferRequestType.Implicit) {
      const createdBuffer = gl.createBuffer();
      if (createdBuffer === null) {
        throw new Error('Cannot create buffer for attribute ' + attributeName);
      }
      buffer = createdBuffer;
      const totalSizeAsNumOfFloats = bufferRequest.totalSizeAsNumOfFloats;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(totalSizeAsNumOfFloats), gl.STATIC_DRAW);
    } else {
      buffer = bufferRequest.buffer;
      // Still need to bind buffer so that `vertexAttribPointer` points to the right buffer:
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    }

    const numFloatsPerVertex = attributeRequest.numFloatsPerVertex;
    const stride = attributeRequest.stride;
    const offset = attributeRequest.offset;

    // Need this step because a "no buffer selected" error will be generated if
    // this attribute is enabled but not bound to any buffer through
    // `bindBuffer`/`vertextAttribPointer` by the time of the first
    // `gl.drawArrays` or `gl.drawElements` call. See
    // https://bugs.webkit.org/show_bug.cgi?id=40315
    gl.enableVertexAttribArray(location);

    gl.vertexAttribPointer(location, numFloatsPerVertex, gl.FLOAT, false, stride, offset);

    if (attributeRequest.isInstanced === true) {
      if (input.version === WebGLVersion.One) {
        input.instancedDrawingExtension.vertexAttribDivisorANGLE(location, 1);
      } else if (input.version === WebGLVersion.Two) {
        input.gl.vertexAttribDivisor(location, 1);
      } else {
        failIfValidOrNonExhaustive(input, 'Invalid version');
      }
    }

    const thisAttributeInfo: IAttributeInfo = {
      location, buffer, numFloatsPerVertex, stride, offset,
    };

    attributeInfo[attributeName] = thisAttributeInfo;
  }

  // Pre-allocate buffer space for index:
  const indexSize = indexBuffer.totalSizeAsNumOfInts;
  const indexElementType = indexBuffer.elementType;

  let dummyDataAsBinary: Uint16Array | Uint32Array;
  let indexElementTypeForDrawCall: number;
  if (indexElementType === IndexElementType.Int16) {
    dummyDataAsBinary = new Uint16Array(indexSize);
    indexElementTypeForDrawCall = gl.UNSIGNED_SHORT;
  } else if (indexElementType === IndexElementType.Int32) {
    dummyDataAsBinary = new Uint32Array(indexSize);
    indexElementTypeForDrawCall = gl.UNSIGNED_INT;
  } else {
    failIfValidOrNonExhaustive(indexElementType, 'Invalid index element type');
    // Following lines will never be executed:
    dummyDataAsBinary = undefined as any;
    indexElementTypeForDrawCall = 0;
  }
  const indicesBuffer = gl.createBuffer();
  if (indicesBuffer === null) {
    throw new Error('Cannot create indices buffer');
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, dummyDataAsBinary, gl.STATIC_DRAW);
  const indexBufferInfo: IIndexBufferInfo = {
    elementType: indexElementTypeForDrawCall, buffer: indicesBuffer,
  };

  if (input.version === WebGLVersion.One) {
    input.vaoExtension.bindVertexArrayOES(null as any);
  } else if (input.version === WebGLVersion.Two) {
    input.gl.bindVertexArray(null as any);
  } else {
    failIfValidOrNonExhaustive(input, 'Invalid version');
  }

  const uniformLocations: Record<string, WebGLUniformLocation> = {};
  for (const uniformName of uniforms) {
    const location = gl.getUniformLocation(program, uniformName);
    if (location === null) {
      throw new Error('Error getting location of uniform variable ' + uniformName + '. ' + gl.getError());
    }
    uniformLocations[uniformName] = location;
  }

  let result: IProgramInfo;
  if (input.version === WebGLVersion.One) {
    result = {
      version: WebGLVersion.One,
      program,
      attributes: attributeInfo,
      uniforms: uniformLocations,
      indexBuffer: indexBufferInfo,
    };
  } else if (input.version === WebGLVersion.Two) {

    const uniformBlockRequests = input.uniformBlocks;
    const uniformBlockInfo: Record<string, IUniformBlockInfo> = {};
    for (const {name, assignedBlockIndex, assignedBuffer} of uniformBlockRequests) {
      // See https://www.khronos.org/opengl/wiki/Uniform_Buffer_Object#OpenGL_Usage
      const blockIndex = input.gl.getUniformBlockIndex(program, name);
      input.gl.uniformBlockBinding(program, blockIndex, assignedBlockIndex);
      input.gl.bindBuffer(input.gl.UNIFORM_BUFFER, assignedBuffer);
      input.gl.bindBufferBase(input.gl.UNIFORM_BUFFER, assignedBlockIndex, assignedBuffer);
      const blockInfo: IUniformBlockInfo = {
        buffer: assignedBuffer,
      };
      uniformBlockInfo[name] = blockInfo;
    }
    result = {
      version: WebGLVersion.Two,
      program,
      attributes: attributeInfo,
      uniforms: uniformLocations,
      indexBuffer: indexBufferInfo,
      uniformBlocks: uniformBlockInfo,
    };
  } else {
    failIfValidOrNonExhaustive(input, 'Invalid version');
    // These lines will never be executed:
    result = undefined as any;
  }

  return result;
};

type IMeasureGPUTimeOptions = {
  description: string,
} & (
  {
    version: WebGLVersion.One;
    gl: WebGLRenderingContext;
    timerExtension: EXTDisjointTimerQuery
  } | {
    version: WebGLVersion.Two;
    gl: WebGL2RenderingContext;
    timerExtension: EXT_disjoint_timer_query_webgl2;
  }
);
export const measureGPUTime = (
    options: IMeasureGPUTimeOptions,
    drawFunction: () => void,
    // This is needed because time measurement result isn't available right away:
    reportingDelay = 1_000) => {

  if (process.env.NODE_ENV === 'production') {
    drawFunction();
  } else {
    if (options.timerExtension === null) {
      console.warn('timer extension is not defined');
      drawFunction();
    } else {

      type StoredQuery = {
        version: WebGLVersion.One;
        query: WebGLTimerQueryEXT;
        timerExtension: EXTDisjointTimerQuery;
        gl: WebGLRenderingContext;
      } | {
        version: WebGLVersion.Two;
        query: WebGLQuery;
        timerExtension: EXT_disjoint_timer_query_webgl2;
        gl: WebGL2RenderingContext;
      };

      let storedQuery: StoredQuery;
      if (options.version === WebGLVersion.One) {
        const timerExtension = options.timerExtension;
        const query =  timerExtension.createQueryEXT();
        storedQuery = {
          version: WebGLVersion.One,
          query,
          timerExtension,
          gl: options.gl,
        };
        timerExtension.beginQueryEXT(timerExtension.TIME_ELAPSED_EXT, query);
      } else {
        const timerExtension = options.timerExtension!;
        const gl = options.gl;
        const query = gl.createQuery();
        storedQuery = {
          version: WebGLVersion.Two,
          query,
          timerExtension,
          gl: options.gl,
        };
        gl.beginQuery(timerExtension.TIME_ELAPSED_EXT, query);
      }

      drawFunction();

      const description = options.description;

      if (storedQuery.version === WebGLVersion.One) {
        const timerExtension = storedQuery.timerExtension;
        const query = storedQuery.query;
        const gl = storedQuery.gl;

        storedQuery.timerExtension.endQueryEXT(storedQuery.timerExtension.TIME_ELAPSED_EXT);

        setTimeout(() => {
          const available = timerExtension.getQueryObjectEXT(query!, timerExtension.QUERY_RESULT_AVAILABLE_EXT);
          const disjoint = gl.getParameter(timerExtension.GPU_DISJOINT_EXT);

          if (available && !disjoint) {
            // See how much time the rendering of the object took in nanoseconds.
            const timeElapsed = timerExtension.getQueryObjectEXT(query!, timerExtension.QUERY_RESULT_EXT);

            console.info('timeElapsed for', description, ':', timeElapsed / 1_000_000, 'ms');
          }
        }, reportingDelay);

      } else {
        const timerExtension = storedQuery.timerExtension;
        const query = storedQuery.query;
        const gl = storedQuery.gl;
        gl.endQuery(timerExtension.TIME_ELAPSED_EXT);

        setTimeout(() => {
          const available = gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE);
          const disjoint = gl.getParameter(timerExtension.GPU_DISJOINT_EXT);

          if (available && !disjoint) {
            const timeElapsed = gl.getQueryParameter(query, gl.QUERY_RESULT);
            console.info('timeElapsed for', description, ':', timeElapsed / 1_000_000, 'ms');
          }

        }, reportingDelay);
      }

    }
  }
};
