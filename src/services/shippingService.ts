import { supabase } from '../lib/supabase';
import { 
  Shipment, 
  PackGroup, 
  Box, 
  PackGroupItem,
  ShipmentWithDetails,
  PackGroupWithDetails,
  PackGroupItemWithASINDetails,
  ASIN
} from '../types/database';
import { getASINByCode, updateASIN } from './database';

// Shipment CRUD operations
export const createShipment = async (name: string): Promise<Shipment> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  console.log('Creating shipment with name:', name);
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      name,
      user_id: user.id,
      total_asins: 0,
      total_units: 0,
      total_weight: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
  
  console.log('Created shipment:', data);
  return data;
};

export const getShipments = async (): Promise<Shipment[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getShipmentWithDetails = async (shipmentId: string): Promise<ShipmentWithDetails | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  console.log('Fetching shipment details for ID:', shipmentId);

  // Get the shipment
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .eq('user_id', user.id)
    .single();

  if (shipmentError) {
    console.error('Error fetching shipment:', shipmentError);
    if (shipmentError.code === 'PGRST116') {
      // Not found error
      return null;
    }
    throw shipmentError;
  }
  if (!shipment) return null;

  console.log('Found shipment:', shipment);

  // Get all pack groups for this shipment
  const { data: packGroups, error: packGroupsError } = await supabase
    .from('pack_groups')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('name');

  if (packGroupsError) {
    console.error('Error fetching pack groups:', packGroupsError);
    throw packGroupsError;
  }

  console.log('Found pack groups:', packGroups?.length || 0);

  // Get all boxes for these pack groups
  const packGroupIds = packGroups?.map(pg => pg.id) || [];
  let boxes: any[] = [];
  
  if (packGroupIds.length > 0) {
    const { data: boxesData, error: boxesError } = await supabase
      .from('boxes')
      .select('*')
      .in('pack_group_id', packGroupIds)
      .order('name');

    if (boxesError) {
      console.error('Error fetching boxes:', boxesError);
      throw boxesError;
    }
    
    boxes = boxesData || [];
  }

  console.log('Found boxes:', boxes.length);

  // Get all pack group items for these pack groups
  let packGroupItems: any[] = [];
  
  if (packGroupIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('pack_group_items')
      .select('*')
      .in('pack_group_id', packGroupIds)
      .order('order_index');

    if (itemsError) {
      console.error('Error fetching pack group items:', itemsError);
      throw itemsError;
    }
    
    packGroupItems = itemsData || [];
  }

  console.log('Found pack group items:', packGroupItems.length);

  // Fetch ASIN details for all items
  const asinDetails = new Map<string, ASIN>();
  for (const item of packGroupItems || []) {
    if (!asinDetails.has(item.asin)) {
      try {
        const asin = await getASINByCode(item.asin);
        if (asin) {
          asinDetails.set(item.asin, asin);
        }
      } catch (error) {
        console.error(`Failed to fetch ASIN details for ${item.asin}:`, error);
      }
    }
  }

  // Build the complete structure
  const packGroupsWithDetails: PackGroupWithDetails[] = (packGroups || []).map(packGroup => {
    const packGroupBoxes = boxes.filter(box => box.pack_group_id === packGroup.id);
    const packGroupItemsFiltered = packGroupItems.filter(item => item.pack_group_id === packGroup.id);

    // Create items with details
    const itemsWithDetails: PackGroupItemWithASINDetails[] = packGroupItemsFiltered.map(item => {
      const asin = asinDetails.get(item.asin);
      const totalBoxed = Object.values(item.boxed_quantities || {}).reduce((sum, qty) => sum + qty, 0);
      const remaining = item.expected_quantity - totalBoxed;
      const itemWeight = asin?.weight || 0;
      const weightMultiplier = (asin?.weight_unit || 'g') === 'kg' ? 1000 : 1;
      const totalWeight = itemWeight * weightMultiplier * totalBoxed;
      
      return {
        ...item,
        asin_details: asin,
        total_boxed: totalBoxed,
        remaining: remaining,
        total_weight: totalWeight
      };
    });

    // Build boxes with items
    const boxesWithItems = packGroupBoxes.map(box => ({
      ...box,
      items: itemsWithDetails.filter(item => 
        item.boxed_quantities && item.boxed_quantities[box.id] > 0
      )
    }));

    return {
      ...packGroup,
      boxes: boxesWithItems,
      items: itemsWithDetails
    };
  });

  const result = {
    ...shipment,
    pack_groups: packGroupsWithDetails
  };

  console.log('Final shipment details:', result);

  return result;
};

export const updateShipment = async (id: string, updates: Partial<Shipment>): Promise<Shipment> => {
  const { data, error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteShipment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Pack Group CRUD operations
export const createPackGroup = async (shipmentId: string, name: string): Promise<PackGroup> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  console.log('Creating pack group:', { shipmentId, name });
  const { data, error } = await supabase
    .from('pack_groups')
    .insert({
      shipment_id: shipmentId,
      name,
      user_id: user.id,
      total_boxes: 0,
      total_units: 0,
      total_weight: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating pack group:', error);
    throw error;
  }
  
  console.log('Created pack group:', data);
  return data;
};

export const updatePackGroup = async (id: string, updates: Partial<PackGroup>): Promise<PackGroup> => {
  const { data, error } = await supabase
    .from('pack_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePackGroup = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pack_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Box CRUD operations
export const createBox = async (packGroupId: string, name: string): Promise<Box> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  console.log('Creating box:', { packGroupId, name });
  const { data, error } = await supabase
    .from('boxes')
    .insert({
      pack_group_id: packGroupId,
      name,
      user_id: user.id,
      weight: 0,
      width: 0,
      length: 0,
      height: 0,
      total_units: 0
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating box:', error);
    throw error;
  }

  // Update pack group total boxes count
  await updatePackGroupBoxCount(packGroupId);

  console.log('Created box:', data);
  return data;
};

export const updateBox = async (id: string, updates: Partial<Box>): Promise<Box> => {
  const { data, error } = await supabase
    .from('boxes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteBox = async (id: string): Promise<void> => {
  // First get the pack group ID before deleting
  const { data: box, error: getError } = await supabase
    .from('boxes')
    .select('pack_group_id')
    .eq('id', id)
    .single();

  if (getError) throw getError;

  const { error } = await supabase
    .from('boxes')
    .delete()
    .eq('id', id);

  if (error) throw error;

  // Update pack group box count
  if (box?.pack_group_id) {
    await updatePackGroupBoxCount(box.pack_group_id);
  }
};

// Pack Group Item CRUD operations
export const createPackGroupItem = async (
  packGroupId: string,
  asin: string,
  sku: string,
  title: string,
  prepType: string,
  expectedQuantity: number,
  orderIndex: number
): Promise<PackGroupItem> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  console.log('Creating pack group item:', { packGroupId, asin, sku, expectedQuantity });
  const { data, error } = await supabase
    .from('pack_group_items')
    .insert({
      pack_group_id: packGroupId,
      asin,
      sku,
      title,
      prep_type: prepType,
      expected_quantity: expectedQuantity,
      boxed_quantities: {},
      user_id: user.id,
      order_index: orderIndex
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating pack group item:', error);
    throw error;
  }
  
  console.log('Created pack group item:', data);
  return data;
};

export const updatePackGroupItem = async (id: string, updates: Partial<PackGroupItem>): Promise<PackGroupItem> => {
  const { data, error } = await supabase
    .from('pack_group_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePackGroupItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pack_group_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Helper functions
export const updatePackGroupBoxCount = async (packGroupId: string): Promise<void> => {
  // Count boxes in this pack group
  const { count, error: countError } = await supabase
    .from('boxes')
    .select('*', { count: 'exact', head: true })
    .eq('pack_group_id', packGroupId);

  if (countError) throw countError;

  // Update pack group
  const { error } = await supabase
    .from('pack_groups')
    .update({ total_boxes: count || 0 })
    .eq('id', packGroupId);

  if (error) throw error;
};

export const updateShipmentTotals = async (shipmentId: string): Promise<void> => {
  // Get all pack groups for this shipment
  const { data: packGroups, error: packGroupsError } = await supabase
    .from('pack_groups')
    .select('*')
    .eq('shipment_id', shipmentId);

  if (packGroupsError) throw packGroupsError;

  // Get all pack group items for this shipment
  const packGroupIds = packGroups?.map(pg => pg.id) || [];
  const { data: items, error: itemsError } = await supabase
    .from('pack_group_items')
    .select('asin, expected_quantity, boxed_quantities')
    .in('pack_group_id', packGroupIds);

  if (itemsError) throw itemsError;

  // Calculate totals
  const uniqueAsins = new Set(items?.map(item => item.asin) || []);
  const totalAsins = uniqueAsins.size;
  const totalUnits = items?.reduce((sum, item) => sum + (item.expected_quantity || 0), 0) || 0;

  // Calculate total weight - need to fetch ASIN details for accurate weights
  let totalWeight = 0;
  for (const item of items || []) {
    try {
      const asin = await getASINByCode(item.asin);
      const itemWeight = asin?.weight || 0;
      const weightMultiplier = (asin?.weight_unit || 'g') === 'kg' ? 1000 : 1;
      const totalBoxed = Object.values(item.boxed_quantities || {}).reduce((sum, qty) => sum + qty, 0);
      totalWeight += itemWeight * weightMultiplier * totalBoxed;
    } catch (error) {
      console.error(`Failed to fetch ASIN details for ${item.asin}:`, error);
    }
  }

  // Update shipment
  const { error } = await supabase
    .from('shipments')
    .update({
      total_asins: totalAsins,
      total_units: totalUnits,
      total_weight: totalWeight
    })
    .eq('id', shipmentId);

  if (error) throw error;
};

export const updatePackGroupTotals = async (packGroupId: string): Promise<void> => {
  // Get all items for this pack group
  const { data: items, error: itemsError } = await supabase
    .from('pack_group_items')
    .select('asin, expected_quantity, boxed_quantities')
    .eq('pack_group_id', packGroupId);

  if (itemsError) throw itemsError;

  // Calculate totals
  const totalUnits = items?.reduce((sum, item) => sum + (item.expected_quantity || 0), 0) || 0;

  // Calculate total weight
  let totalWeight = 0;
  for (const item of items || []) {
    try {
      const asin = await getASINByCode(item.asin);
      const itemWeight = asin?.weight || 0;
      const weightMultiplier = (asin?.weight_unit || 'g') === 'kg' ? 1000 : 1;
      const totalBoxed = Object.values(item.boxed_quantities || {}).reduce((sum, qty) => sum + qty, 0);
      totalWeight += itemWeight * weightMultiplier * totalBoxed;
    } catch (error) {
      console.error(`Failed to fetch ASIN details for ${item.asin}:`, error);
    }
  }

  // Update pack group
  const { error } = await supabase
    .from('pack_groups')
    .update({
      total_units: totalUnits,
      total_weight: totalWeight
    })
    .eq('id', packGroupId);

  if (error) throw error;
};

// Batch update function for saving pack group item quantities
export const updatePackGroupItemQuantities = async (
  updates: Array<{ id: string; boxed_quantities: { [boxId: string]: number } }>
): Promise<void> => {
  if (updates.length === 0) return;

  // Use update instead of upsert to avoid RLS issues
  const { error } = await supabase
    .from('pack_group_items')
    .update({ boxed_quantities: updates[0].boxed_quantities })
    .eq('id', updates[0].id);

  if (error) throw error;

  // Process remaining updates one by one
  for (let i = 1; i < updates.length; i++) {
    const { error: updateError } = await supabase
      .from('pack_group_items')
      .update({ boxed_quantities: updates[i].boxed_quantities })
      .eq('id', updates[i].id);
    
    if (updateError) throw updateError;
  }

  // Get unique pack group IDs for updating totals
  const { data: items, error: getError } = await supabase
    .from('pack_group_items')
    .select('pack_group_id, pack_groups!inner(shipment_id)')
    .in('id', updates.map(u => u.id));

  if (getError) throw getError;

  const uniquePackGroupIds = new Set<string>();
  const uniqueShipmentIds = new Set<string>();

  items?.forEach(item => {
    uniquePackGroupIds.add(item.pack_group_id);
    uniqueShipmentIds.add(item.pack_groups.shipment_id);
  });

  // Update pack group totals
  await Promise.all(
    Array.from(uniquePackGroupIds).map(packGroupId => updatePackGroupTotals(packGroupId))
  );

  // Update shipment totals
  await Promise.all(
    Array.from(uniqueShipmentIds).map(shipmentId => updateShipmentTotals(shipmentId))
  );
};

// Function to update FNSKU from CSV data
export const updateASINFromCSV = async (asin: string, fnsku: string): Promise<void> => {
  try {
    const existingASIN = await getASINByCode(asin);
    if (existingASIN && (!existingASIN.fnsku || existingASIN.fnsku !== fnsku)) {
      await updateASIN(existingASIN.id, { fnsku });
    }
  } catch (error) {
    console.error(`Failed to update FNSKU for ASIN ${asin}:`, error);
  }
};