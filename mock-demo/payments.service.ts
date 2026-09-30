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

export interface CreateSubscriptionRequest {
  customerId: string;
  planTier: 'starter' | 'professional' | 'enterprise';
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  trialPeriodDays?: number;
  paymentMethodToken: string;
  autoRenew: boolean;
}

export interface SubscriptionResponse {
  subscriptionId: string;
  customerId: string;
  planTier: 'starter' | 'professional' | 'enterprise';
  status: 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled';
  billingInterval: 'monthly' | 'quarterly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  recurringAmount: number;
}

export interface ProrationCalculationResponse {
  subscriptionId: string;
  currentPlanTier: string;
  targetPlanTier: string;
  unusedDays: number;
  totalCycleDays: number;
  prorationCredit: number;
  newPlanProratedCharge: number;
  immediateBalanceDue: number;
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

  /**
   * Create and activate a recurring subscription plan with optional free trial
   * @param req Subscription creation parameters including plan tier and billing cycle
   */
  async createSubscription(req: CreateSubscriptionRequest): Promise<SubscriptionResponse> {
    const trialDays = req.trialPeriodDays || 0;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + (trialDays > 0 ? trialDays : 30) * 86400000);

    const priceMap = { starter: 29.0, professional: 99.0, enterprise: 299.0 };

    return {
      subscriptionId: 'sub_' + Math.random().toString(36).substring(2, 10),
      customerId: req.customerId,
      planTier: req.planTier,
      status: trialDays > 0 ? 'trialing' : 'active',
      billingInterval: req.billingInterval,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      nextBillingDate: periodEnd.toISOString(),
      recurringAmount: priceMap[req.planTier],
    };
  }

  /**
   * Calculate mid-cycle plan upgrade or downgrade proration credit
   * @param subscriptionId Target subscription ID
   * @param newPlanTier Target upgrade/downgrade plan tier
   */
  async calculateProration(
    subscriptionId: string,
    newPlanTier: 'starter' | 'professional' | 'enterprise'
  ): Promise<ProrationCalculationResponse> {
    const currentPrice = 99.0;
    const newPrice = newPlanTier === 'enterprise' ? 299.0 : 29.0;
    const unusedRatio = 0.5; // mid-cycle (15 days of 30 remaining)
    
    const prorationCredit = currentPrice * unusedRatio;
    const newPlanProratedCharge = newPrice * unusedRatio;
    const immediateBalanceDue = Math.max(0, newPlanProratedCharge - prorationCredit);

    return {
      subscriptionId,
      currentPlanTier: 'professional',
      targetPlanTier: newPlanTier,
      unusedDays: 15,
      totalCycleDays: 30,
      prorationCredit,
      newPlanProratedCharge,
      immediateBalanceDue,
    };
  }

  /**
   * Temporarily pause an active recurring subscription without cancelling billing records
   * @param subscriptionId Unique subscription identifier
   * @param pauseDurationDays Duration in days to hold recurring billing charges
   */
  async pauseSubscription(
    subscriptionId: string,
    pauseDurationDays: number
  ): Promise<{ subscriptionId: string; status: 'paused'; resumeAt: string }> {
    const resumeDate = new Date(Date.now() + pauseDurationDays * 86400000);

    return {
      subscriptionId,
      status: 'paused',
      resumeAt: resumeDate.toISOString(),
    };
  }
}
