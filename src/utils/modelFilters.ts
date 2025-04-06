import { Model } from '../types';
import { FILTER_VALUES } from '../constants';
import { PriceFilter, ModalityFilter } from '../components/ModelFilters';

// Helper function to check if a model is free
export const isFreeModel = (model: Model): boolean => {
  // Check if model ID contains 'free'
  if (model.id.includes(':free')) return true;
  
  // Check pricing structure
  if (model.pricing) {
    const prompt = Number(model.pricing.prompt) || 0;
    const completion = Number(model.pricing.completion) || 0;
    
    // If both prompt and completion are 0, it's free
    return prompt === 0 && completion === 0;
  }
  
  return false;
};

// Helper function to check if a model supports multimodal inputs
export const isMultimodalModel = (model: Model): boolean => {
  if (!model.architecture || !model.architecture.modality) return false;
  
  // If modality contains 'image', it's multimodal
  return model.architecture.modality.includes('image');
};

// Apply all filters to a list of models
export const applyModelFilters = (
  models: Model[],
  searchQuery: string,
  priceFilter: PriceFilter,
  modalityFilter: ModalityFilter
): Model[] => {
  let filtered = [...models];
  
  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(model => 
      model.name.toLowerCase().includes(query) || 
      (model.description && model.description.toLowerCase().includes(query))
    );
  }
  
  // Filter by price
  if (priceFilter !== FILTER_VALUES.ALL) {
    filtered = filtered.filter(model => {
      const isFree = isFreeModel(model);
      return (priceFilter === FILTER_VALUES.FREE && isFree) || 
             (priceFilter === FILTER_VALUES.PAID && !isFree);
    });
  }
  
  // Filter by modality
  if (modalityFilter !== FILTER_VALUES.ALL) {
    filtered = filtered.filter(model => {
      const isMultimodal = isMultimodalModel(model);
      return (modalityFilter === FILTER_VALUES.MULTIMODAL && isMultimodal) || 
             (modalityFilter === FILTER_VALUES.TEXT && !isMultimodal);
    });
  }
  
  return filtered;
}; 