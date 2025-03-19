declare module '@huggingface/transformers' {
  export class RawImage {
    width: number;
    height: number;
    channels: number;
    data: Uint8Array;
  }
  
  export function pipeline(task: string, model: string, options?: any): Promise<any>;
} 