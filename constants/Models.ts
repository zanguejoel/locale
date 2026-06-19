export interface ModelCapabilities {
  vision?: boolean;
  search?: boolean;
  pdf?: boolean;
  reasoning?: boolean;
  imageGeneration?: boolean; // Can generate images (default: true if undefined)
  videoGeneration?: boolean; // Can generate videos (default: true if undefined)
}

export interface Model {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'opensource' | 'claude' | 'gpt' | 'gemini' | 'grok';
  capabilities: ModelCapabilities;
  isNew?: boolean;
  isFast?: boolean;
}

export const models: Model[] = [
  {
    id: 'us.meta.llama4-maverick-17b-instruct-v1:0',
    name: 'LLama 4 Maverick 17B',
    displayName: 'LLama 4 Maverick 17B',
    description: 'LLama model with enhanced capabilities',
    category: 'opensource',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: false,
      imageGeneration: false,
      videoGeneration: false
    }
  },
 
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    displayName: 'Claude Sonnet 4.5',
    description: 'Enhanced Claude model with improved capabilities',
    category: 'claude',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: false
    },
    isNew: true
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    displayName: 'Claude Sonnet 4',
    description: 'Latest Claude model with good performance',
    category: 'claude',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: false
    },
    isNew: false
  },
  {
    id: 'claude-sonnet-4-20250514-thinking',
    name: 'Claude Sonnet 4 Thinking',
    displayName: 'Claude Sonnet 4 Thinking',
    description: 'Latest Claude model with enhanced reasoning',
    category: 'claude',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: true
    },
    isNew: false
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    displayName: 'Claude Opus 4',
    description: 'Latest Claude model with enhanced reasoning',
    category: 'claude',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: false
    },
    isNew: false
  },
 
  {
    id: 'gpt-5-chat-latest',
    name: 'ChatGPT 5',
    displayName: 'ChatGPT 5',
    description: 'Latest GPT 5 model with advanced capabilities',
    category: 'gpt',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: true
    },
    isNew: true
  },
  {
    id: 'gpt-5-2025-08-07',
    name: 'GPT 5',
    displayName: 'GPT 5',
    description: 'GPT 5 model from August 2025 with enhanced capabilities',
    category: 'gpt',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: true
    },
    isNew: true
  },
  {
    id: 'gpt-5-mini-2025-08-07',
    name: 'GPT 5 Mini',
    displayName: 'GPT 5 Mini',
    description: 'Faster version of GPT 5 with optimized performance',
    category: 'gpt',
    capabilities: {
      vision: true,
      search: true,
      pdf: true
    },
    isNew: true,
    isFast: true
  },
  {
    id: 'gpt-5-nano-2025-08-07',
    name: 'GPT 5 Nano',
    displayName: 'GPT 5 Nano',
    description: 'Ultra-fast compact version of GPT 5',
    category: 'gpt',
    capabilities: {
      search: true,
      pdf: true
    },
    isNew: true,
    isFast: true
  },
  {
    id: 'gpt-4o-2024-08-06',
    name: 'GPT 4o',
    displayName: 'GPT 4o',
    description: 'Latest GPT model with advanced capabilities',
    category: 'gpt',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: false
    }
  },
  {
    id: 'gpt-4o-mini-2024-07-18',
    name: 'GPT 4o Mini',
    displayName: 'GPT 4o Mini',
    description: 'Faster version of GPT 4o',
    category: 'gpt',
    capabilities: {
      search: true,
      pdf: true
    },
    isFast: true
  },
  {
    id: 'gpt-4.1-2025-04-14',
    name: 'GPT 4.1',
    displayName: 'GPT 4.1',
    description: 'Stable GPT model with good performance',
    category: 'gpt',
    capabilities: {
      vision: true,
      search: true,
      pdf: true
    }
  },
  {
    id: 'gpt-4.1-mini-2025-04-14',
    name: 'GPT 4.1 Mini',
    displayName: 'GPT 4.1 Mini',
    description: 'Faster version of GPT 4.1',
    category: 'gpt',
    capabilities: {
      search: true
    },
    isFast: true
  },
  {
    id: 'gpt-4.1-nano-2025-04-14',
    name: 'GPT 4.1 Nano',
    displayName: 'GPT 4.1 Nano',
    description: 'Fastest GPT model',
    category: 'gpt',
    capabilities: {
      search: true
    },
    isFast: true
  },
  
  {
    id: 'o3-2025-04-16',
    name: 'O3',
    displayName: 'O3',
    description: 'Advanced reasoning model with superior capabilities',
    category: 'gpt',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: true
    },
    isNew: true
  },
  {
    id: 'o3-mini-2025-01-31',
    name: 'O3 Mini',
    displayName: 'O3 Mini',
    description: 'Compact reasoning model with good performance',
    category: 'gpt',
    capabilities: {
      search: true,
      pdf: true,
      reasoning: true
    },
    isNew: true
  },
  {
    id: 'o4-mini-2025-04-16',
    name: 'O4 Mini',
    displayName: 'O4 Mini',
    description: 'Latest compact reasoning model with advanced capabilities',
    category: 'gpt',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: true
    },
    isNew: true
  },
  {
    id: 'gemini/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    displayName: 'Gemini 2.0 Flash',
    description: 'Fast Gemini model optimized for speed',
    category: 'gemini',
    capabilities: {
      search: true
    },
    isFast: true
  },
  {
    id: 'gemini/gemini-2.5-pro-preview-03-25',
    name: 'Gemini 2.5 Pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Latest Gemini model with enhanced capabilities',
    category: 'gemini',
    capabilities: {
      vision: true,
      search: true,
      pdf: true,
      reasoning: false
    },
    isNew: true
  },
  {
    id: 'gemini/gemini-2.5-flash-preview-04-17',
    name: 'Gemini 2.5 Flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Fastest Gemini model with good performance',
    category: 'gemini',
    capabilities: {
      search: true,
      pdf: true
    },
    isFast: true
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    displayName: 'Grok 4',
    description: 'New advanced Grok model with superior capabilities',
    category: 'grok',
    capabilities: {
      vision: true,
      search: true,
      pdf: true
    },
    isNew: true
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    displayName: 'Grok 3',
    description: 'Advanced Grok model',
    category: 'grok',
    capabilities: {
      vision: true,
      search: true,
      pdf: true
    }
  },
/*   {
    id: 'grok-3-fast',
    name: 'Grok 3 Fast',
    displayName: 'Grok 3 Fast',
    description: 'Advanced Grok model with superior capabilities (Faster but costlier)',
    category: 'grok',
    capabilities: {
      vision: true,
      search: true,
      pdf: true
    },
    isNew: true
  }, */
  {
    id: 'grok-3-mini-thinking',
    name: 'Grok 3 Mini Thinking',
    displayName: 'Grok 3 Mini Thinking',
    description: 'Grok mini model with thinking capabilities',
    category: 'grok',
    capabilities: {
      search: true,
      pdf: true,
      reasoning: true
    },
    isFast: true
  },
/*   {
    id: 'grok-3-mini-fast-thinking',
    name: 'Grok 3 Mini Fast Thinking',
    displayName: 'Grok 3 Mini Fast Thinking',
    description: 'Fast Grok mini model with thinking capabilities (Faster but costlier)',
    category: 'grok',
    capabilities: {
      search: true,
      pdf: true,
      reasoning: true
    },
    isFast: true
  }, */
];

// Helper function to get model by ID
export const getModelById = (id: string): Model | undefined => {
  return models.find(model => model.id === id);
};

// Helper function to get models by category
export const getModelsByCategory = (category: Model['category']): Model[] => {
  return models.filter(model => model.category === category);
};

// Helper function to check if a model is a Llama model
export const isLlamaModel = (modelId: string): boolean => {
  const model = getModelById(modelId);
  if (!model) return false;
  
  // Check if model name or ID contains "llama" (case insensitive)
  return model.name.toLowerCase().includes('llama') || 
         model.id.toLowerCase().includes('llama') ||
         model.displayName.toLowerCase().includes('llama');
};

// Helper function to check if a model can generate images and/or videos
export const canGenerateMedia = (modelId: string): { image: boolean; video: boolean } => {
  const model = getModelById(modelId);
  if (!model) {
    // Default to true if model not found
    return { image: true, video: true };
  }
  
  // Default to true if capability is undefined
  return {
    image: model.capabilities.imageGeneration !== false,
    video: model.capabilities.videoGeneration !== false
  };
};

