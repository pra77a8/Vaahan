// =============================================================================
// VAAHAN TRANSIT SYSTEM - RAZORPAY & PASS EXPIRY SERVICE
// Secure Test Mode Integration with Server-Side Verification
// =============================================================================

import { supabase } from '../lib/supabase';
import { PassExpiryStatus, PassRenewalRecord } from '../types';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

/**
 * Computes the normalized pass status based on the expiry date:
 * - MISSING_EXPIRY: If expiry date is null/undefined
 * - EXPIRED: If expiry date < today
 * - EXPIRING_SOON: If 0 <= days until expiry <= 7
 * - ACTIVE: If days until expiry > 7
 */
export const computePassStatus = (expiryDate?: string | null): PassExpiryStatus => {
  if (!expiryDate) return 'MISSING_EXPIRY';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 7) return 'EXPIRING_SOON';
  return 'ACTIVE';
};

/**
 * Calculates days remaining until pass expiration:
 * - Positive number: days left
 * - 0: expires today
 * - Negative number: days overdue/expired
 * - null: no expiry date recorded
 */
export const calculateDaysRemaining = (expiryDate?: string | null): number | null => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Formats a date string into readable DD Mon YYYY format.
 */
export const formatDateReadable = (dateStr?: string | null): string => {
  if (!dateStr) return 'Not Specified';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

/**
 * Dynamically loads the Razorpay Standard Checkout JavaScript SDK.
 */
export const loadRazorpayCheckoutScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

/**
 * Creates a ₹1.00 Razorpay Order via Supabase Edge Function create-razorpay-order
 */
export const createPassRenewalOrder = async (
  studentId: string,
  notes?: Record<string, string>
): Promise<{
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: {
        studentId,
        notes,
      },
    });

    if (error) {
      console.error('Supabase Edge Function create-razorpay-order error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize payment gateway order.',
      };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Payment gateway failed to issue an order ID.',
      };
    }

    return {
      success: true,
      orderId: data.order_id,
      amount: data.amount,
      currency: data.currency,
      keyId: data.key_id,
    };
  } catch (err: any) {
    console.error('Network error creating pass renewal order:', err);
    return {
      success: false,
      error: err.message || 'Unable to connect to payment server.',
    };
  }
};

/**
 * Submits the completed payment response to verify-razorpay-payment Edge Function
 * for cryptographic signature verification and atomic database renewal.
 */
export const verifyPassRenewalPayment = async (data: {
  orderId: string;
  paymentId: string;
  signature: string;
  studentId: string;
  amount?: number;
}): Promise<{
  success: boolean;
  newExpiryDate?: string;
  receiptNumber?: string;
  error?: string;
}> => {
  try {
    const { data: resData, error } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: {
        razorpay_order_id: data.orderId,
        razorpay_payment_id: data.paymentId,
        razorpay_signature: data.signature,
        student_id: data.studentId,
        amount: data.amount || 1.0,
      },
    });

    if (error) {
      console.error('Payment verification Edge Function failed:', error);
      return {
        success: false,
        error: error.message || 'Payment verification failed on the server.',
      };
    }

    if (!resData?.success) {
      return {
        success: false,
        error: resData?.error || 'Transaction cryptographic signature could not be verified.',
      };
    }

    return {
      success: true,
      newExpiryDate: resData.data?.new_expiry_date,
      receiptNumber: resData.data?.receipt_number,
    };
  } catch (err: any) {
    console.error('Network error verifying Razorpay payment:', err);
    return {
      success: false,
      error: err.message || 'Payment validation service temporarily unreachable.',
    };
  }
};

/**
 * Opens Razorpay Standard Checkout in Test Mode for ₹1.00 pass renewal.
 */
export const openPassRenewalCheckout = async (options: {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  prn?: string;
  onSuccess: (result: {
    paymentId: string;
    orderId: string;
    newExpiryDate?: string;
    receiptNumber?: string;
  }) => void;
  onFailure: (errorMsg: string) => void;
  onDismiss?: () => void;
}): Promise<void> => {
  const isLoaded = await loadRazorpayCheckoutScript();
  if (!isLoaded) {
    options.onFailure('Unable to load payment gateway checkout component. Check your internet connection.');
    return;
  }

  // 1. Create order on server
  const orderRes = await createPassRenewalOrder(options.studentId, {
    prn: options.prn || '',
    student_name: options.studentName,
  });

  if (!orderRes.success || !orderRes.orderId || !orderRes.keyId) {
    options.onFailure(orderRes.error || 'Could not initiate payment order.');
    return;
  }

  const razorpayOptions = {
    key: orderRes.keyId,
    amount: orderRes.amount || 100, // 100 paise = ₹1.00
    currency: orderRes.currency || 'INR',
    name: 'K. K. Wagh Transit Cell',
    description: 'Student Bus Pass Renewal (180 Days Term)',
    image: 'https://www.kkwagh.edu.in/images/logo.png',
    order_id: orderRes.orderId,
    prefill: {
      name: options.studentName,
      email: options.studentEmail,
      contact: options.studentPhone || '+919823000000',
    },
    notes: {
      student_id: options.studentId,
      prn: options.prn || '',
      type: 'BUS_PASS_RENEWAL_TEST',
    },
    theme: {
      color: '#0284c7', // Sky-600
    },
    modal: {
      ondismiss: () => {
        if (options.onDismiss) options.onDismiss();
      },
      escape: true,
      backdropclose: false,
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      // 2. Server-side signature verification
      const verifyRes = await verifyPassRenewalPayment({
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
        studentId: options.studentId,
        amount: 1.0,
      });

      if (verifyRes.success) {
        options.onSuccess({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          newExpiryDate: verifyRes.newExpiryDate,
          receiptNumber: verifyRes.receiptNumber,
        });
      } else {
        options.onFailure(verifyRes.error || 'Payment was received but verification failed.');
      }
    },
  };

  try {
    const rzp = new window.Razorpay(razorpayOptions);
    rzp.on('payment.failed', (failRes: any) => {
      console.warn('Razorpay payment failed:', failRes);
      options.onFailure(
        failRes.error?.description || 'Payment was unsuccessful or declined by bank.'
      );
    });
    rzp.open();
  } catch (e: any) {
    options.onFailure(e.message || 'Could not launch payment window.');
  }
};

/**
 * Fetches pass renewal audit history for a specific student.
 */
export const fetchStudentRenewals = async (studentId: string): Promise<PassRenewalRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('pass_renewals')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      previousExpiryDate: r.previous_expiry_date,
      newExpiryDate: r.new_expiry_date,
      amount: Number(r.amount),
      currency: r.currency || 'INR',
      razorpayOrderId: r.razorpay_order_id,
      razorpayPaymentId: r.razorpay_payment_id,
      razorpaySignature: r.razorpay_signature,
      paymentStatus: r.payment_status,
      term: r.term,
      createdAt: r.created_at,
    }));
  } catch (e) {
    console.warn('Error fetching student renewals:', e);
    return [];
  }
};

/**
 * Fetches all pass renewal transactions for the administrator portal.
 */
export const fetchAllRenewals = async (): Promise<PassRenewalRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('pass_renewals')
      .select(`
        *,
        students (
          prn,
          department,
          profiles ( full_name )
        )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      previousExpiryDate: r.previous_expiry_date,
      newExpiryDate: r.new_expiry_date,
      amount: Number(r.amount),
      currency: r.currency || 'INR',
      razorpayOrderId: r.razorpay_order_id,
      razorpayPaymentId: r.razorpay_payment_id,
      razorpaySignature: r.razorpay_signature,
      paymentStatus: r.payment_status,
      term: r.term,
      createdAt: r.created_at,
      studentName: r.students?.profiles?.full_name || 'Student',
      prn: r.students?.prn || 'N/A',
      department: r.students?.department || 'Engineering',
    }));
  } catch (e) {
    console.warn('Error fetching all renewals:', e);
    return [];
  }
};

/**
 * Triggers the automated 7-day expiry alert check RPC.
 */
export const runExpiryCheckRpc = async (): Promise<{
  success: boolean;
  student_notifications_sent: number;
  admin_notifications_sent: number;
  checked_at?: string;
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('check_and_notify_expiring_passes');
    if (error) {
      return {
        success: false,
        student_notifications_sent: 0,
        admin_notifications_sent: 0,
        error: error.message,
      };
    }
    return {
      success: true,
      student_notifications_sent: data?.student_notifications_sent || 0,
      admin_notifications_sent: data?.admin_notifications_sent || 0,
      checked_at: data?.checked_at,
    };
  } catch (e: any) {
    return {
      success: false,
      student_notifications_sent: 0,
      admin_notifications_sent: 0,
      error: e.message || 'Failed to run expiry check.',
    };
  }
};

