/**
 * Sample Service File for Testing AutoDocs Documentation Generation
 * 
 * AutoDocs automatically extracts TypeScript ASTs, classes, decorators,
 * methods, parameters, and interfaces into structured documentation.
 */

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'upi' | 'paypal';
  discountCoupon?: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed' | 'cancelled';
  timestamp: string;
  receiptUrl?: string;
}

export interface CancelPaymentRequest {
  orderId: string;
  transactionId: string;
  cancellationReason: string;
  notifyCustomer?: boolean;
}

export interface CancelPaymentResponse {
  cancelled: boolean;
  cancellationFee: number;
  refundedAmount: number;
  timestamp: string;
}

export class PaymentService {
  /**
   * Process a customer payment transaction
   * @param req The payment details including order ID, amount, and discount coupon
   */
  async processPayment(req: PaymentRequest): Promise<PaymentResponse> {
    console.log(`Processing payment of ${req.amount} ${req.currency} for order ${req.orderId}`);
    
    return {
      transactionId: 'txn_' + Date.now(),
      status: 'succeeded',
      timestamp: new Date().toISOString(),
      receiptUrl: `https://pay.example.com/receipts/${req.orderId}`,
    };
  }

  /**
   * Refund an existing transaction
   * @param transactionId The ID of the original transaction
   * @param reason The customer support or cancellation reason
   */
  async refundPayment(transactionId: string, reason: string): Promise<{ success: boolean; refundedAt: string }> {
    console.log(`Refunding transaction ${transactionId} due to: ${reason}`);
    
    return {
      success: true,
      refundedAt: new Date().toISOString(),
    };
  }

  /**
   * Cancel an in-progress or pending order payment
   * @param req Cancellation request details with transaction ID and reason
   */
  async cancelPayment(req: CancelPaymentRequest): Promise<CancelPaymentResponse> {
    console.log(`Cancelling payment transaction ${req.transactionId} for order ${req.orderId}`);
    
    return {
      cancelled: true,
      cancellationFee: 0,
      refundedAmount: 100.0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Retrieve the real-time status of a payment transaction
   * @param transactionId Unique identifier of the transaction
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    return {
      transactionId,
      status: 'succeeded',
      timestamp: new Date().toISOString(),
    };
  }
}
