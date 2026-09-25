/**
 * Sample Service File for Testing AutoDocs Documentation Generation
 * 
 * 
 * You can push this file to your GitHub repository to test how AutoDocs
 * automatically parses TypeScript classes, methods, decorators, and interfaces.
 */

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'upi' | 'paypal';
}

export interface PaymentResponse {
  transactionId: string;
  status: 'succeeded' | 'pending' | 'failed';
  timestamp: string;
  receiptUrl?: string;
}

export class PaymentService {
  /**
   * Process a customer payment transaction
   * @param req The payment details including order ID and amount
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
}
