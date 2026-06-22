/**
 * Local Models Configuration for ExecuTorch Integration
 * 
 * This file defines the available local AI models that can run on-device
 * using react-native-executorch.
 * 
 * Documentation: https://docs.swmansion.com/react-native-executorch/
 */

import {
  LLAMA3_2_1B_QLORA,
  LLAMA3_2_1B_SPINQUANT,
  LLAMA3_2_3B_QLORA,
  ALL_MINILM_L6_V2,
} from 'react-native-executorch';

/**
 * On-device text embeddings model used for RAG inside Navigator modules
 * (e.g. Procedure Hub case search). Loaded lazily — only when a Navigator
 * workspace is opened — not at app launch, since most users won't use it.
 */
export const EMBEDDINGS_MODEL = ALL_MINILM_L6_V2;

/**
 * Local Model Configuration Interface
 */
export interface LocalModelConfig {
  /** Unique identifier for the model */
  id: string;
  
  /** Display name shown to users */
  name: string;
  
  /** ExecuTorch model constant from react-native-executorch */
  model: any;
  
  /** Model size on disk (download size) */
  size: string;
  
  /** RAM usage during inference */
  ram: string;
  
  /** Expected tokens per second on reference device */
  speed: string;
  
  /** Brief description of model capabilities */
  description: string;
  
  /** Minimum device requirements */
  minDevice: string;
  
  /** Context window size in tokens */
  contextWindow: number;
  
  /** Quality rating: 'good' | 'better' | 'best' */
  quality: 'good' | 'better' | 'best';
  
  /** Whether this model is recommended */
  recommended?: boolean;
}

/**
 * Available Local Models
 * 
 * Models are listed from smallest/fastest to largest/best quality.
 * The first model in the list is used as the default.
 */
export const LOCAL_MODELS: LocalModelConfig[] = [
  {
    id: 'llama-3.2-1b-qlora',
    name: 'Llama 3.2 1B',
    model: LLAMA3_2_1B_QLORA,
    size: '1.18 GB',
    ram: '2.2 GB',
    speed: '~32 tokens/sec',
    description: 'Lightest model, perfect for most conversations',
    minDevice: 'iPhone 12+ / 4GB RAM',
    contextWindow: 2048,
    quality: 'good',
    recommended: true,
  },
  {
    id: 'llama-3.2-1b-spinquant',
    name: 'Llama 3.2 1B SpinQuant',
    model: LLAMA3_2_1B_SPINQUANT,
    size: '0.95 GB',
    ram: '2.0 GB',
    speed: '~35 tokens/sec',
    description: 'Ultra-lightweight, fastest response time',
    minDevice: 'iPhone 12 / 4GB RAM',
    contextWindow: 2048,
    quality: 'good',
  },
  {
    id: 'llama-3.2-3b-qlora',
    name: 'Llama 3.2 3B',
    model: LLAMA3_2_3B_QLORA,
    size: '2.8 GB',
    ram: '4.0 GB',
    speed: '~18 tokens/sec',
    description: 'Higher quality responses, better reasoning',
    minDevice: 'iPhone 13 Pro / 6GB RAM',
    contextWindow: 2048,
    quality: 'better',
  },
];

/**
 * Default Local Model
 * 
 * This is the model that will be used by default when users
 * first enable local AI mode.
 */
export const DEFAULT_LOCAL_MODEL = LOCAL_MODELS[0]; // Llama 3.2 1B QLoRA

/**
 * Get model configuration by ID
 */
export function getLocalModelById(id: string): LocalModelConfig | undefined {
  return LOCAL_MODELS.find(model => model.id === id);
}

/**
 * Get recommended model for device
 * 
 * This function could be enhanced to detect device capabilities
 * and recommend the best model based on available RAM.
 */
export function getRecommendedModel(): LocalModelConfig {
  return LOCAL_MODELS.find(m => m.recommended) || DEFAULT_LOCAL_MODEL;
}

/**
 * Model Capabilities
 * 
 * These define what local models can and cannot do compared
 * to cloud models.
 */
export const LOCAL_MODEL_CAPABILITIES = {
  // What local models CAN do
  canDo: [
    'Text chat and conversations',
    'Question answering',
    'Text summarization',
    'Basic coding help',
    'Creative writing',
    'Math and reasoning (basic)',
    'Language translation',
    'Offline operation',
  ],
  
  // What local models CANNOT do
  cannotDo: [
    'Web search / real-time data',
    'Image generation',
    'File attachments / vision',
    'Very long conversations (>2K tokens)',
    'Real-time API calls',
    'Multi-modal inputs',
  ],
} as const;

/**
 * Performance Benchmarks
 * 
 * Expected performance on different devices.
 * These are approximate values based on community testing.
 */
export const PERFORMANCE_BENCHMARKS = {
  'iPhone 12': {
    'llama-3.2-1b-qlora': { speed: '20-25 t/s', memory: '2.3 GB' },
    'llama-3.2-1b-spinquant': { speed: '25-30 t/s', memory: '2.1 GB' },
    'llama-3.2-3b-qlora': { speed: '12-15 t/s', memory: '4.2 GB' },
  },
  'iPhone 13 Pro': {
    'llama-3.2-1b-qlora': { speed: '30-35 t/s', memory: '2.2 GB' },
    'llama-3.2-1b-spinquant': { speed: '35-40 t/s', memory: '2.0 GB' },
    'llama-3.2-3b-qlora': { speed: '15-20 t/s', memory: '4.0 GB' },
  },
  'iPhone 14 Pro': {
    'llama-3.2-1b-qlora': { speed: '30-40 t/s', memory: '2.2 GB' },
    'llama-3.2-1b-spinquant': { speed: '35-45 t/s', memory: '2.0 GB' },
    'llama-3.2-3b-qlora': { speed: '18-25 t/s', memory: '4.0 GB' },
  },
  'iPhone 15 Pro': {
    'llama-3.2-1b-qlora': { speed: '35-45 t/s', memory: '2.1 GB' },
    'llama-3.2-1b-spinquant': { speed: '40-50 t/s', memory: '1.9 GB' },
    'llama-3.2-3b-qlora': { speed: '20-30 t/s', memory: '3.8 GB' },
  },
} as const;

/**
 * Configuration Limits
 */
export const LOCAL_MODEL_LIMITS = {
  /** Maximum number of messages to include in context */
  MAX_CONTEXT_MESSAGES: 20,
  
  /** Maximum tokens per request (approximate) */
  MAX_TOKENS_PER_REQUEST: 2048,
  
  /** Minimum RAM required for local models (bytes) */
  MIN_RAM_REQUIRED: 4 * 1024 * 1024 * 1024, // 4 GB
  
  /** Minimum storage space required (bytes) */
  MIN_STORAGE_REQUIRED: 2 * 1024 * 1024 * 1024, // 2 GB
} as const;

/**
 * Platform Support
 */
export const PLATFORM_SUPPORT = {
  ios: {
    minVersion: '17.0',
    supported: true,
    notes: 'Fully supported with hardware acceleration',
  },
  android: {
    minVersion: '8.0',
    minSdk: 26,
    supported: true,
    notes: 'Supported on ARM64 devices',
  },
} as const;

