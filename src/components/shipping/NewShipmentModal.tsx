import React, { useState } from 'react';
import { X, Upload, Package, AlertCircle, Loader2 } from 'lucide-react';
import { createShipment, createPackGroup, createBox, createPackGroupItem, updateASINFromCSV } from '../../services/shippingService';
import { parseMultiplePackGroupCsvs, isValidPackGroupCsv } from '../../utils/shippingCsvParser';

interface NewShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (shipmentId: string) => void;
}

const NewShipmentModal: React.FC<NewShipmentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [shipmentName, setShipmentName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const invalidFiles = files.filter(file => !isValidPackGroupCsv(file));
    if (invalidFiles.length > 0) {
      setError(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Please select CSV files only.`);
      return;
    }
    
    setSelectedFiles(files);
    setError(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shipmentName.trim()) {
      setError('Please enter a shipment name');
      return;
    }
    
    if (selectedFiles.length === 0) {
      setError('Please select at least one CSV file');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Create the shipment
      const shipment = await createShipment(shipmentName.trim());
      
      // Parse all CSV files
      const parsedData = await parseMultiplePackGroupCsvs(selectedFiles);
      
      // Process each pack group
      for (const packGroupData of parsedData) {
        // Create pack group
        const packGroup = await createPackGroup(shipment.id, packGroupData.packGroupName);
        
        // Create boxes for this pack group
        const boxes = [];
        for (let i = 1; i <= packGroupData.totalBoxCount; i++) {
          const boxName = `${packGroupData.packGroupName.replace('Pack Group ', 'P')}-B${i}`;
          const box = await createBox(packGroup.id, boxName);
          boxes.push(box);
        }
        
        // Create pack group items
        for (const item of packGroupData.items) {
          // Update ASIN FNSKU if needed
          if (item.fnsku) {
            await updateASINFromCSV(item.asin, item.fnsku);
          }
          
          // Create pack group item
          await createPackGroupItem(
            packGroup.id,
            item.asin,
            item.sku,
            item.title,
            item.prepType,
            item.expectedQuantity,
            item.orderIndex
          );
        }
      }
      
      onSuccess(shipment.id);
      onClose();
      
      // Reset form
      setShipmentName('');
      setSelectedFiles([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShipmentName('');
    setSelectedFiles([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">New Shipment</h2>
              <p className="text-sm text-gray-400">Create a new shipment and import pack group CSV files</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors duration-300 hover:scale-102"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-900/50 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 text-red-300 text-sm mb-6 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Shipment Name */}
          <div className="mb-6">
            <div className="relative">
              <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <input
                  type="text"
                  id="shipmentName"
                  value={shipmentName}
                  onChange={(e) => setShipmentName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                  placeholder="Shipment Name"
                />
                <label
                  htmlFor="shipmentName"
                  className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                >
                  Shipment Name *
                </label>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-blue-400 mb-3">
              Pack Group CSV Files *
            </label>
            
            <div className="border-2 border-dashed border-gray-600/50 rounded-xl bg-gray-800/30 backdrop-blur-sm">
              {selectedFiles.length > 0 ? (
                <div className="p-6">
                  {/* Selected Files */}
                  <div className="space-y-3 mb-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700/50 backdrop-blur-sm rounded-lg p-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-600/20 rounded-lg">
                            <Upload className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{file.name}</p>
                            <p className="text-gray-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add More Files Button */}
                  <label className="block">
                    <button
                      type="button"
                      className="w-full bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center justify-center space-x-2"
                      onClick={() => document.getElementById('csv-upload')?.click()}
                    >
                      <Upload className="h-5 w-5" />
                      <span>Add More Files</span>
                    </button>
                    <input
                      id="csv-upload"
                      type="file"
                      multiple
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="block p-8 text-center cursor-pointer hover:border-blue-500/50 transition-colors duration-300">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Click to select pack group CSV files</p>
                  <p className="text-gray-500 text-sm">You can select multiple files at once</p>
                  <input
                    type="file"
                    multiple
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              Select one or more Amazon pack group CSV files. Each file will create a separate pack group in your shipment.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700/50">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !shipmentName.trim() || selectedFiles.length === 0}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  <span>Create Shipment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewShipmentModal;