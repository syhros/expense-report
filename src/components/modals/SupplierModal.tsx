import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, Globe, MapPin, FileText } from 'lucide-react';
import { createSupplier, updateSupplier } from '../../services/database';
import { Supplier } from '../../types/database';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
}

const SupplierModal: React.FC<SupplierModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  supplier 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    site: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        address: supplier.address || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        site: supplier.site || '',
        notes: supplier.notes || ''
      });
    } else {
      setFormData({
        name: '',
        address: '',
        email: '',
        phone: '',
        site: '',
        notes: ''
      });
    }
    setError(null);
  }, [supplier, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (supplier) {
        await updateSupplier(supplier.id, formData);
      } else {
        await createSupplier(formData);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800/90 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              {supplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Supplier Name */}
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Building2 className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Supplier Name"
                  />
                  <label
                    htmlFor="name"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Supplier Name *
                  </label>
                </div>
              </div>

              {/* Email */}
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Mail className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Email Address"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Email Address
                  </label>
                </div>
              </div>

              {/* Phone */}
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Phone className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Phone Number"
                  />
                  <label
                    htmlFor="phone"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Phone Number
                  </label>
                </div>
              </div>

              {/* Address - Moved here after phone */}
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <MapPin className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Address"
                  />
                  <label
                    htmlFor="address"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Address
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Website */}
              <div className="relative">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Globe className="h-5 w-5 text-blue-400" />
                  </div>
                  <input
                    type="url"
                    id="site"
                    name="site"
                    value={formData.site}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none"
                    placeholder="Website"
                  />
                  <label
                    htmlFor="site"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Website
                  </label>
                </div>
              </div>

              {/* Notes - Increased height to match column */}
              <div className="relative flex-1">
                <div className="relative border-2 border-blue-500/50 rounded-xl bg-gray-800/50 backdrop-blur-sm h-64">
                  <div className="absolute left-3 top-4">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={10}
                    className="w-full h-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-transparent focus:outline-none resize-none"
                    placeholder="Notes"
                  />
                  <label
                    htmlFor="notes"
                    className="absolute left-10 -top-2.5 bg-gray-800 px-2 text-sm font-medium text-blue-400"
                  >
                    Notes
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-400 hover:text-white transition-all duration-300 hover:scale-102"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <span>{supplier ? 'Update' : 'Create'} Supplier</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;