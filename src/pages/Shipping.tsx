import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Upload, ArrowLeft, Download, Save, AlertCircle } from 'lucide-react';
import Card from '../components/shared/Card';
import NewShipmentModal from '../components/shipping/NewShipmentModal';
import ShipmentCard from '../components/shipping/ShipmentCard';
import AddBoxModal from '../components/shipping/AddBoxModal';
import PackGroupTabs from '../components/shipping/PackGroupTabs';
import ProductCard from '../components/shipping/ProductCard';
import BoxDetailsSection from '../components/shipping/BoxDetailsSection';
import { useShipments, useShipmentDetails } from '../hooks/useShippingData';
import { 
  deleteShipment, 
  updateBox, 
  updatePackGroupItemQuantities,
  createBox
} from '../services/shippingService';
import { downloadShipmentExport, validateShipmentForExport } from '../utils/shippingExport';
import { formatWeightInKg } from '../utils/formatters';
import { Box, PackGroupItemWithASINDetails } from '../types/database';

const Shipping: React.FC = () => {
  const navigate = useNavigate();
  const { shipments, loading: shipmentsLoading, refetch: refetchShipments } = useShipments();
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [activePackGroupId, setActivePackGroupId] = useState<string | null>(null);
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingQuantityChanges, setPendingQuantityChanges] = useState<{
    [itemId: string]: { [boxId: string]: number }
  }>({});

  const { 
    shipmentDetails, 
    loading: shipmentLoading, 
    error: shipmentError,
    refetch: refetchShipmentDetails 
  } = useShipmentDetails(selectedShipmentId);

  // Set active pack group when shipment details load
  React.useEffect(() => {
    if (shipmentDetails && shipmentDetails.pack_groups.length > 0 && !activePackGroupId) {
      setActivePackGroupId(shipmentDetails.pack_groups[0].id);
    }
  }, [shipmentDetails, activePackGroupId]);

  // Calculate estimated shipment weight
  const calculateEstimatedShipmentWeight = (): number => {
    if (!shipmentDetails) return 0;
    
    let totalWeight = 0;
    shipmentDetails.pack_groups.forEach(packGroup => {
      packGroup.items.forEach(item => {
        const asinWeight = item.asin_details?.weight || 0;
        const weightMultiplier = (item.asin_details?.weight_unit || 'g') === 'kg' ? 1000 : 1;
        const weightInGrams = asinWeight * weightMultiplier;
        totalWeight += weightInGrams * item.expected_quantity;
      });
    });
    
    return totalWeight;
  };

  // Calculate estimated pack group weight
  const calculateEstimatedPackGroupWeight = (packGroupId: string): number => {
    if (!shipmentDetails) return 0;
    
    const packGroup = shipmentDetails.pack_groups.find(pg => pg.id === packGroupId);
    if (!packGroup) return 0;
    
    let totalWeight = 0;
    packGroup.items.forEach(item => {
      const asinWeight = item.asin_details?.weight || 0;
      const weightMultiplier = (item.asin_details?.weight_unit || 'g') === 'kg' ? 1000 : 1;
      const weightInGrams = asinWeight * weightMultiplier;
      totalWeight += weightInGrams * item.expected_quantity;
    });
    
    return totalWeight;
  };

  const handleNewShipment = () => {
    setShowNewShipmentModal(true);
  };

  const handleShipmentCreated = (shipmentId: string) => {
    refetchShipments();
    setSelectedShipmentId(shipmentId);
    setActivePackGroupId(null);
  };

  const handleViewShipment = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setActivePackGroupId(null);
    setPendingQuantityChanges({});
  };

  const handleDeleteShipment = async (shipmentId: string) => {
    try {
      await deleteShipment(shipmentId);
      refetchShipments();
      if (selectedShipmentId === shipmentId) {
        setSelectedShipmentId(null);
        setActivePackGroupId(null);
      }
    } catch (error) {
      console.error('Failed to delete shipment:', error);
    }
  };

  const handleBackToShipments = () => {
    setSelectedShipmentId(null);
    setActivePackGroupId(null);
    setPendingQuantityChanges({});
  };

  const handlePackGroupSelect = (packGroupId: string) => {
    setActivePackGroupId(packGroupId);
  };

  const handleQuantityChange = (itemId: string, boxId: string, quantity: number) => {
    setPendingQuantityChanges(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [boxId]: quantity
      }
    }));
    setSaveError(null);
  };

  const handleBoxUpdate = async (boxId: string, updates: Partial<Box>) => {
    try {
      await updateBox(boxId, updates);
      refetchShipmentDetails();
    } catch (error) {
      console.error('Failed to update box:', error);
    }
  };

  const handleSave = async () => {
    if (Object.keys(pendingQuantityChanges).length === 0) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // Convert pending changes to the format expected by the service
      const updates = Object.entries(pendingQuantityChanges).map(([itemId, boxQuantities]) => ({
        id: itemId,
        boxed_quantities: boxQuantities
      }));

      await updatePackGroupItemQuantities(updates);
      setPendingQuantityChanges({});
      refetchShipmentDetails();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!shipmentDetails) return;

    const validation = validateShipmentForExport(shipmentDetails);
    if (!validation.isValid) {
      alert(`Cannot export shipment:\n\n${validation.errors.join('\n')}`);
      return;
    }

    downloadShipmentExport(shipmentDetails);
  };

  const handleAddBox = () => {
    setShowAddBoxModal(true);
  };

  const handleBoxCreated = () => {
    refetchShipmentDetails();
  };

  const activePackGroup = shipmentDetails?.pack_groups.find(pg => pg.id === activePackGroupId);
  const hasUnsavedChanges = Object.keys(pendingQuantityChanges).length > 0;
  const estimatedShipmentWeightKg = calculateEstimatedShipmentWeight();
  const estimatedPackGroupWeightKg = activePackGroupId ? calculateEstimatedPackGroupWeight(activePackGroupId) : 0;

  // Show shipments list
  if (!selectedShipmentId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Shipments</h1>
              <p className="text-gray-400">Manage your Amazon FBA shipments</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {/* TODO: Implement import */}}
              className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
            <button
              onClick={handleNewShipment}
              className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Shipment</span>
            </button>
          </div>
        </div>

        {/* Shipments Grid */}
        {shipmentsLoading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </Card>
        ) : shipments.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <Package className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Shipments Yet</h2>
              <p className="text-gray-400 mb-6">
                Create your first shipment to start managing your Amazon FBA inventory.
              </p>
              <button
                onClick={handleNewShipment}
                className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Create First Shipment</span>
              </button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                onView={handleViewShipment}
                onDelete={handleDeleteShipment}
              />
            ))}
          </div>
        )}

        <NewShipmentModal
          isOpen={showNewShipmentModal}
          onClose={() => setShowNewShipmentModal(false)}
          onSuccess={handleShipmentCreated}
        />
      </div>
    );
  }

  // Show shipment details
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBackToShipments}
            className="p-2 bg-gray-700/50 backdrop-blur-sm hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-102"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600/80 backdrop-blur-sm rounded-xl">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {shipmentDetails?.name || 'Loading...'}
              </h1>
              <div className="flex items-center space-x-4">
                {/* Estimated Weight */}
                <div className="bg-yellow-600/30 backdrop-blur-sm border border-yellow-600/50 rounded-lg px-3 py-1">
                  <span className="text-yellow-400 text-sm font-medium">
                    Est. {formatWeightInKg(estimatedShipmentWeightKg)}
                  </span>
                </div>
                <p className="text-gray-400">
                  {shipmentDetails ? 
                    `${shipmentDetails.total_asins} ASINs • ${shipmentDetails.total_units} units` :
                    'Loading shipment details...'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            disabled={!shipmentDetails}
            className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => {/* TODO: Implement add pack group */}}
            className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Pack Group</span>
          </button>
        </div>
      </div>

      {shipmentLoading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Loading shipment details...</span>
          </div>
        </Card>
      ) : shipmentError || !shipmentDetails ? (
        <Card className="p-8">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Shipment Not Found</h2>
            <p className="text-gray-400">
              {shipmentError || 'The requested shipment could not be loaded.'}
            </p>
            <button
              onClick={handleBackToShipments}
              className="mt-4 bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102"
            >
              Back to Shipments
            </button>
          </div>
        </Card>
      ) : (
        <>
          {/* Pack Group Tabs */}
          <Card className="p-6">
            <PackGroupTabs
              packGroups={shipmentDetails.pack_groups}
              activePackGroupId={activePackGroupId}
              onPackGroupSelect={handlePackGroupSelect}
            />
          </Card>

          {activePackGroup && (
            <>
              {/* Pack Group Header */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{activePackGroup.name}</h2>
                    <div className="flex items-center space-x-4">
                      {/* Estimated Weight */}
                      <div className="bg-yellow-600/30 backdrop-blur-sm border border-yellow-600/50 rounded-lg px-3 py-1">
                        <span className="text-yellow-400 text-sm font-medium">
                          Est. {formatWeightInKg(estimatedPackGroupWeightKg)}
                        </span>
                      </div>
                      <p className="text-gray-400">
                        {activePackGroup.boxes.length} boxes • {activePackGroup.total_units} units
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {hasUnsavedChanges && (
                      <div className="flex items-center space-x-2 text-yellow-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">Unsaved changes</span>
                      </div>
                    )}
                    
                    <button
                      onClick={handleAddBox}
                      className="bg-green-600/80 backdrop-blur-sm hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Box</span>
                    </button>
                  </div>
                </div>
              </Card>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                {activePackGroup.items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={{
                      ...item,
                      boxed_quantities: {
                        ...item.boxed_quantities,
                        ...pendingQuantityChanges[item.id]
                      },
                      total_boxed: Object.values({
                        ...item.boxed_quantities,
                        ...pendingQuantityChanges[item.id]
                      }).reduce((sum, qty) => sum + qty, 0),
                      remaining: item.expected_quantity - Object.values({
                        ...item.boxed_quantities,
                        ...pendingQuantityChanges[item.id]
                      }).reduce((sum, qty) => sum + qty, 0)
                    }}
                    boxes={activePackGroup.boxes}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>

              {/* Box Details */}
              <BoxDetailsSection
                boxes={activePackGroup.boxes}
                onBoxUpdate={handleBoxUpdate}
              />

              {/* Save Button */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    {saveError && (
                      <div className="flex items-center space-x-2 text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{saveError}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasUnsavedChanges}
                    className="bg-blue-600/80 backdrop-blur-sm hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-102 flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* Modals */}
      {activePackGroup && (
        <AddBoxModal
          isOpen={showAddBoxModal}
          onClose={() => setShowAddBoxModal(false)}
          onSuccess={handleBoxCreated}
          packGroupId={activePackGroup.id}
          packGroupName={activePackGroup.name}
          existingBoxCount={activePackGroup.boxes.length}
        />
      )}
    </div>
  );
};

export default Shipping;