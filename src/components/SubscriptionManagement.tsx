import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Crown, Zap, Star, Loader2 } from 'lucide-react';

interface SubscriptionManagementProps {
  onSubscriptionChange?: () => void;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ 
  onSubscriptionChange 
}) => {
  const { subscription, session, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan: string) => {
    if (!session) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      
      // Refresh subscription status after a delay
      setTimeout(() => {
        checkSubscription();
        onSubscriptionChange?.();
      }, 5000);
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Checkout failed",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      
      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Portal access failed",
        description: "Failed to access customer portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      analyses: '10 analyses',
      features: ['Basic UX analysis', 'Essential insights', 'Standard support'],
      tier: 'free',
      icon: Star,
      color: 'text-muted-foreground',
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      analyses: 'Unlimited analyses',
      features: ['Advanced UX analysis', 'AI-powered insights', 'Priority support', 'Multi-model AI'],
      tier: 'pro',
      icon: Crown,
      color: 'text-primary',
      popular: true,
    },
    {
      name: 'Premium',
      price: '$19',
      period: 'per month',
      analyses: '100 analyses',
      features: ['Advanced UX analysis', 'Detailed insights', 'Premium support'],
      tier: 'premium',
      icon: Zap,
      color: 'text-blue-600',
    },
  ];

  const currentTier = subscription?.subscription_tier || 'free';
  const isSubscribed = subscription?.subscribed || false;

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Subscription
            <Badge variant={isSubscribed ? "default" : "secondary"}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          </CardTitle>
          <CardDescription>
            {subscription && (
              <>
                Analysis Usage: {subscription.analysis_count} / {subscription.analysis_limit === -1 ? '∞' : subscription.analysis_limit}
                {subscription.subscription_end && (
                  <span className="block">
                    Next billing: {new Date(subscription.subscription_end).toLocaleDateString()}
                  </span>
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
        {isSubscribed && (
          <CardContent>
            <Button 
              onClick={handleManageSubscription}
              disabled={loading}
              variant="outline"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Subscription
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentTier === plan.tier;
          const canUpgrade = !isCurrentPlan && (
            (plan.tier === 'pro' && currentTier !== 'pro') ||
            (plan.tier === 'premium' && currentTier === 'free')
          );

          return (
            <Card 
              key={plan.tier} 
              className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <Icon className={`h-8 w-8 ${plan.color}`} />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>
                <CardDescription className="font-medium">
                  {plan.analyses}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {isCurrentPlan ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : canUpgrade ? (
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(plan.tier)}
                    disabled={loading}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade to {plan.name}
                  </Button>
                ) : (
                  <Button className="w-full" disabled variant="outline">
                    {plan.tier === 'free' ? 'Downgrade via Portal' : 'Contact Sales'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <Button 
          variant="ghost" 
          onClick={checkSubscription}
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Refresh Subscription Status
        </Button>
      </div>
    </div>
  );
};