import { supabase } from '../lib/supabase';

export const uploadReceipt = async (transactionId: string, file: File): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${transactionId}-${Date.now()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filePath, file);

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const getReceiptUrl = (filePath: string): string => {
  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const deleteReceipt = async (fileUrl: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Extract file path from URL
  const urlParts = fileUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const filePath = `${user.id}/${fileName}`;

  const { error } = await supabase.storage
    .from('receipts')
    .remove([filePath]);

  if (error) throw error;
};

export const listReceipts = async (transactionId: string): Promise<string[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.storage
    .from('receipts')
    .list(user.id, {
      search: transactionId
    });

  if (error) throw error;

  return data?.map(file => `${user.id}/${file.name}`) || [];
};