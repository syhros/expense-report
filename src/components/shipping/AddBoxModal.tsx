import React, { useState } from 'react';
import { X, Package, Loader2 } from 'lucide-react';
import { createBox } from '../../services/shippingService';

interface AddBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packGroupId: string;
  packGroupName: string;
  existingBoxCount: number;
}

const AddBoxModal: React.FC<AddBoxModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  packGroupId,
  packGroupName,
  existingBoxCount
}) => {
  const [boxName, setBoxName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      // Auto-generate box name
      const packGroupPrefix = packGroupName.replace('Pack Group ', 'P');
      const nextBoxNumber = existingBoxCount + 1;
      setBoxName(`${packGroupPrefix}-B${nextBoxNumber}`);
    } else {
      setBoxName('');
      setError(null);
    }
  }, [isOpen, packGroupName, existingBoxCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!boxName.trim()) {
      setError('Please enter a box name');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      await createBox(packGroupId, boxName.trim());
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create box');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600/80 backdrop-blur-sm rounded-xl">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Add Box</h2>
              <p className="text-sm text-gray-400">{packGroupName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-300 hover:scale-102"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-900/50 backdrop-blur-sm border border-red-700/50 rounded-xl p-4 text-red-300 text-sm mb-6">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <div className="relative border-2 border-green-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Package className="h-5 w-5 text-green-400" />
                </div>
                <input
                  type="text"
                  id="boxName"
                  value={boxName}
                  onChange={(e) => setBoxName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                  placeholder="Box Name"
                />
                <label
                  htmlFor="boxName"
                  className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-green-400"
                >
                  Box Name *
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Box name will be used for identification and export
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !boxName.trim()}
              className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  <span>Create Box</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBoxModal;