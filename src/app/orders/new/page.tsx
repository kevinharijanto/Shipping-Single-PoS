"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { countryMap, getFullCountryName } from "@/lib/countryMapping";

interface Customer {
  id: string;
  name: string;
  phone: string;
  phoneCode?: string;
  shopeeName: string | null;
  _count?: { orders: number };
}

interface Buyer {
  id: number;
  saleRecordNumber?: string;
  buyerFullName: string;
  buyerCountry: string;
  buyerCity: string;
  buyerState?: string;
  buyerZip?: string;
  buyerAddress1?: string;
  buyerPhone: string;
  phoneCode?: string;
}


export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculator state
  const [quoteData, setQuoteData] = useState<any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  
  // HS Code validation state
  const [validatingHsCode, setValidatingHsCode] = useState(false);
  const [hsCodeValidation, setHsCodeValidation] = useState<any>(null);
  const [hsCodeError, setHsCodeError] = useState<string | null>(null);
  
  // Search state
  const [customerSearch, setCustomerSearch] = useState("");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [nextSrn, setNextSrn] = useState("2187");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const buyerInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerId: "",
    buyerId: "",
    notes: "",
    weightGrams: "",
    totalValue: "",
    packageDescription: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    service: "",
    serviceDisplayName: "",
    paymentMethod: "qris",
    currency: "USD",
    shippingPriceMinor: "0",
    sku: "",
    hsCode: "",
    countryOfOrigin: "ID",
  });

  // Inline editable details (permanent panels). Default phoneCode to +62
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phoneCode: "+62",
    phone: "",
    shopeeName: "",
  });

  const [buyerDetails, setBuyerDetails] = useState({
    saleRecordNumber: "2187",
    buyerFullName: "",
    buyerAddress1: "",
    buyerCity: "",
    buyerState: "",
    buyerZip: "",
    buyerCountry: "",
    buyerPhone: "",
    phoneCode: "",
  });


  // Permanent panels with optional pickers (no mode toggles)


  // Calculate selected buyer early to use in useEffect
  const selectedBuyer = buyers.find((b) => b.id.toString() === formData.buyerId);

  useEffect(() => {
    fetchCustomers();
    fetchBuyers();
    fetchNextSrn();
  }, []);

  async function fetchNextSrn() {
    try {
      const response = await fetch("/api/next-srn");
      if (response.ok) {
        const data = await response.json();
        setNextSrn(data.nextSrn);
        setBuyerDetails(prev => ({ ...prev, saleRecordNumber: data.nextSrn }));
      }
    } catch (err) {
      console.error("Error fetching next SRN:", err);
    }
  }

  async function fetchCustomers() {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }

  async function fetchBuyers() {
    try {
      const response = await fetch("/api/buyers");
      if (response.ok) {
        const data = await response.json();
        setBuyers(data);
      }
    } catch (err) {
      console.error("Error fetching buyers:", err);
    } finally {
      setFetchingData(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleCustomerDetailsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value }));
  }

  function handleBuyerDetailsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setBuyerDetails((prev) => ({ ...prev, [name]: value }));
  }

  // Map API service codes to Prisma enum values
  function mapServiceCodeToEnum(serviceCode: string): string {
    switch (serviceCode) {
      case 'ES': // Economy Standard
        return 'economy_standard';
      case 'EP': // Economy Plus
        return 'economy_plus';
      case 'EX': // Express
        return 'express';
      case 'PP': // Packet Premium
        return 'packet_premium';
      default:
        return 'economy_standard'; // Default fallback
    }
  }

  // Handle service selection change
  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const serviceCode = e.target.value;
    const availableServices = getAvailableServices();
    const service = availableServices.find(s => s.code === serviceCode);
    
    if (service) {
      setSelectedService(service);
    } else if (serviceCode === "") {
      setSelectedService(null);
    }
  }

  // Validate HS Code
  async function validateHsCode(hsCode: string) {
    if (!hsCode.trim()) {
      setHsCodeValidation(null);
      setHsCodeError(null);
      return;
    }

    setValidatingHsCode(true);
    setHsCodeError(null);
    
    try {
      const response = await fetch(`/api/kurasi/validate-hscode?hsCode=${encodeURIComponent(hsCode.trim())}`);
      const data = await response.json();
      
      if (response.ok) {
        setHsCodeValidation(data);
      } else {
        // Handle specific error cases
        let errorMessage = data.error || 'Failed to validate HS Code';
        
        if (data.returnCode === 'LG003') {
          errorMessage = 'Authentication required. Please check API credentials.';
        } else if (data.returnMessage) {
          errorMessage = data.returnMessage;
        }
        
        setHsCodeError(errorMessage);
        setHsCodeValidation(null);
      }
    } catch (err) {
      setHsCodeError('Network error validating HS Code');
      setHsCodeValidation(null);
    } finally {
      setValidatingHsCode(false);
    }
  }

  // Handle HS Code input change with validation
  function handleHsCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, hsCode: value }));
    
    // Validate HS Code after user stops typing (debounce)
    const timer = setTimeout(() => {
      validateHsCode(value);
    }, 500);
    
    return () => clearTimeout(timer);
  }

  // Fetch shipping quote when relevant fields change
  useEffect(() => {
    const fetchQuote = async () => {
      const shortCountryCode = buyerDetails.buyerCountry || selectedBuyer?.buyerCountry;
      if (!shortCountryCode || !formData.weightGrams) return;
      
      // Convert short country code to full country name using static mapping
      const fullCountryName = getFullCountryName(shortCountryCode);
      
      setLoadingQuote(true);
      setQuoteError(null);
      
      try {
        const response = await fetch("/api/kurasi/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json" },
          body: JSON.stringify({
            actualHeight: formData.heightCm || "0",
            actualLength: formData.lengthCm || "0",
            actualWeight: formData.weightGrams,
            actualWidth: formData.widthCm || "0",
            country: fullCountryName,
            currencyType: "IDR",
            supportedCountryCode: "ID",
          }),
        });
        
        const data = await response.json();
        if (!response.ok || data.status !== "SUCCESS") {
          setQuoteError(data?.errorMessage || `Failed to get quote`);
          setQuoteData(null);
        } else {
          setQuoteData(data);
        }
      } catch (e: any) {
        setQuoteError(e?.message || "Network error");
        setQuoteData(null);
      } finally {
        setLoadingQuote(false);
      }
    };

    const timer = setTimeout(() => {
      fetchQuote();
    }, 500); // Debounce quote requests

    return () => clearTimeout(timer);
  }, [buyerDetails.buyerCountry, selectedBuyer?.buyerCountry, formData.weightGrams, formData.lengthCm, formData.widthCm, formData.heightCm, formData.currency]);

  // Get all available services
  function getAvailableServices() {
    if (!quoteData?.raw) return [];
    
    const services = [
      { key: "esr", code: "ES", title: "Economy Standard" },
      { key: "epr", code: "EP", title: "Economy Plus" },
      { key: "err", code: "EX", title: "Express" },
      { key: "ppr", code: "PP", title: "Packet Premium" },
    ];
    
    const available = services
      .map(s => ({
        ...s,
        amount: quoteData.raw[s.key]?.doubleAmount ?? null,
        displayAmount: quoteData.raw[s.key]?.amount ?? null,
      }))
      .filter(s => s.amount !== null);
    
    return available.sort((a, b) => a.amount - b.amount);
  }

  // Get cheapest available service
  function getCheapestService() {
    const available = getAvailableServices();
    return available.length > 0 ? available[0] : null;
  }

  // Update service and shipping price based on quote response
  useEffect(() => {
    if (quoteData && getCheapestService()) {
      const cheapest = getCheapestService();
      if (cheapest && !selectedService) {
        // Auto-select cheapest service if none selected
        setSelectedService(cheapest);
        // Convert price to minor units (multiply by 100)
        const shippingPriceInMinor = Math.round((cheapest.amount || 0) * 100);
        
        setFormData(prev => ({
          ...prev,
          service: mapServiceCodeToEnum(cheapest.code || ""),
          serviceDisplayName: cheapest.title || "",
          shippingPriceMinor: shippingPriceInMinor.toString()
        }));
      }
    }
  }, [quoteData]);

  // Update shipping price when service selection changes
  useEffect(() => {
    if (selectedService) {
      // Convert price to minor units (multiply by 100)
      const shippingPriceInMinor = Math.round((selectedService.amount || 0) * 100);
      
      setFormData(prev => ({
        ...prev,
        service: mapServiceCodeToEnum(selectedService.code || ""),
        serviceDisplayName: selectedService.title || "",
        shippingPriceMinor: shippingPriceInMinor.toString()
      }));
    }
  }, [selectedService]);

  // Filter customers and buyers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch) ||
    (customer.shopeeName && customer.shopeeName.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  const filteredBuyers = buyers.filter(buyer =>
    buyer.buyerFullName.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    buyer.buyerCountry.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    buyer.buyerCity.toLowerCase().includes(buyerSearch.toLowerCase())
  );

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({ ...prev, customerId: customer.id }));
    setCustomerSearch(`${customer.name} (${customer.phone})${customer.shopeeName ? ` - ${customer.shopeeName}` : ''}`);
    setShowCustomerDropdown(false);
  };

  // Handle buyer selection
  const handleBuyerSelect = (buyer: Buyer) => {
    setFormData(prev => ({ ...prev, buyerId: buyer.id.toString() }));
    setBuyerSearch(`${buyer.buyerFullName} (${buyer.buyerCountry})`);
    setShowBuyerDropdown(false);
  };

  // Populate editable panels when selection changes (auto-fill from picker)
  useEffect(() => {
    const sc = customers.find((c) => c.id === formData.customerId);
    if (sc) {
      setCustomerDetails({
        name: sc.name || "",
        phoneCode: sc.phoneCode || "",
        phone: sc.phone || "",
        shopeeName: sc.shopeeName || "",
      });
    }
    const sb = buyers.find((b) => b.id.toString() === formData.buyerId);
    if (sb) {
      setBuyerDetails({
        saleRecordNumber: nextSrn, // Keep the auto-generated SRN, don't use the buyer's SRN
        buyerFullName: sb.buyerFullName || "",
        buyerAddress1: sb.buyerAddress1 || "",
        buyerCity: sb.buyerCity || "",
        buyerState: sb.buyerState || "",
        buyerZip: sb.buyerZip || "",
        buyerCountry: sb.buyerCountry || "",
        buyerPhone: sb.buyerPhone || "",
        phoneCode: sb.phoneCode || "",
      });
    }
  }, [formData.customerId, formData.buyerId, customers, buyers, nextSrn]);
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerInputRef.current && !customerInputRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (buyerInputRef.current && !buyerInputRef.current.contains(event.target as Node)) {
        setShowBuyerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);












  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Determine customerId and buyerId based on picker selections; create new from permanent panels if none selected
      let customerId = formData.customerId;
      let buyerId = formData.buyerId;

      // Customer
      if (!customerId) {
        if (!customerDetails.name.trim() || !customerDetails.phone.trim()) {
          throw new Error("Provide customer name and phone, or select an existing customer");
        }
        const createCustomerRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customerDetails.name.trim(),
            phone: customerDetails.phone.trim(),
            phoneCode: (customerDetails.phoneCode || "+62").trim(),
            shopeeName: customerDetails.shopeeName.trim() || null,
          }),
        });
        if (!createCustomerRes.ok) {
          const errorData = await createCustomerRes.json();
          throw new Error(errorData.error || "Failed to create customer");
        }
        const createdCustomer = await createCustomerRes.json();
        customerId = createdCustomer.id;
        await fetchCustomers();
      }

      // Recipient
      if (!buyerId) {
        const requiredRecipient = [
          buyerDetails.buyerFullName,
          buyerDetails.buyerAddress1,
          buyerDetails.buyerCity,
          buyerDetails.buyerZip,
          buyerDetails.buyerCountry,
          buyerDetails.buyerPhone,
        ];
        if (requiredRecipient.some((v) => !v.trim())) {
          throw new Error("Complete recipient details or select an existing recipient");
        }
        
        // Get fresh SRN to ensure uniqueness
        const nextSrnRes = await fetch("/api/next-srn");
        if (!nextSrnRes.ok) {
          throw new Error("Failed to get next SRN");
        }
        const { nextSrn: freshSrn } = await nextSrnRes.json();
        
        const createBuyerRes = await fetch("/api/buyers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saleRecordNumber: freshSrn.trim(),
            buyerFullName: buyerDetails.buyerFullName.trim(),
            buyerAddress1: buyerDetails.buyerAddress1.trim(),
            buyerAddress2: "",
            buyerCity: buyerDetails.buyerCity.trim(),
            buyerState: buyerDetails.buyerState.trim(),
            buyerZip: buyerDetails.buyerZip.trim(),
            buyerCountry: buyerDetails.buyerCountry.trim(),
            buyerPhone: buyerDetails.buyerPhone.trim(),
            phoneCode: (buyerDetails.phoneCode || "").trim(),
          }),
        });
        if (!createBuyerRes.ok) {
          const errorData = await createBuyerRes.json();
          throw new Error(errorData.error || "Failed to create recipient");
        }
        const createdBuyer = await createBuyerRes.json();
        buyerId = createdBuyer.id.toString();
        // Update the displayed SRN to the actual one used
        setBuyerDetails(prev => ({ ...prev, saleRecordNumber: freshSrn }));
        setNextSrn(freshSrn);
        await fetchBuyers();
      }

      // Build order data
      const orderData = {
        ...formData,
        customerId,
        buyerId,
        weightGrams: formData.weightGrams ? parseInt(formData.weightGrams) : null,
        totalValue: formData.totalValue ? parseFloat(formData.totalValue) : null,
        packageDescription: formData.packageDescription || "",
        lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
        widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        currency: formData.currency || "USD",
        sku: formData.sku || "",
        hsCode: formData.hsCode || "",
        countryOfOrigin: formData.countryOfOrigin || "",
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      router.push("/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const selectedCustomer = customers.find((c) => c.id === formData.customerId);

  if (fetchingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Order</h1>
          <p className="text-gray-600">Add a new shipping order</p>
        </div>
        <Link href="/orders" className="btn">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer and Recipient Selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer picker or new form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
              <div className="relative" ref={customerInputRef}>
                <input
                  type="text"
                  placeholder="Search and select customer..."
                  value={customerSearch || (selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})${selectedCustomer.shopeeName ? ` - ${selectedCustomer.shopeeName}` : ''}` : '')}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (e.target.value === '') {
                      setFormData(prev => ({ ...prev, customerId: '' }));
                    }
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="input w-full"
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {customer.name} ({customer.phone})
                          {customer.shopeeName && ` - ${customer.shopeeName}`}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No customers found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={customerDetails.name}
                    onChange={handleCustomerDetailsChange}
                    className="input w-full"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Code</label>
                  <input
                    type="text"
                    name="phoneCode"
                    value={customerDetails.phoneCode}
                    onChange={handleCustomerDetailsChange}
                    className="input w-full"
                    placeholder="e.g. +62"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={customerDetails.phone}
                    onChange={handleCustomerDetailsChange}
                    className="input w-full"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Shopee Name</label>
                  <input
                    type="text"
                    name="shopeeName"
                    value={customerDetails.shopeeName}
                    onChange={handleCustomerDetailsChange}
                    className="input w-full"
                    placeholder="Shopee username"
                  />
                </div>
              </div>
            </div>

            {/* SRN Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale Record Number (SRN)</label>
              <input
                type="text"
                name="saleRecordNumber"
                value={nextSrn}
                onChange={handleBuyerDetailsChange}
                className="input w-full"
                placeholder="Sale Record Number"
                readOnly
                title="Auto-generated SRN starting from 2187"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated SRN starting from 2187</p>
            </div>
            
            {/* Recipient picker or new form */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipient *</label>
              <div className="relative" ref={buyerInputRef}>
                <input
                  type="text"
                  placeholder="Search and select recipient..."
                  value={buyerSearch || (selectedBuyer ? `${selectedBuyer.buyerFullName} (${selectedBuyer.buyerCountry})` : '')}
                  onChange={(e) => {
                    setBuyerSearch(e.target.value);
                    if (e.target.value === '') {
                      setFormData(prev => ({ ...prev, buyerId: '' }));
                    }
                    setShowBuyerDropdown(true);
                  }}
                  onFocus={() => setShowBuyerDropdown(true)}
                  className="input w-full"
                />
                {showBuyerDropdown && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                    {filteredBuyers.length > 0 ? (
                      filteredBuyers.map((buyer) => (
                        <div
                          key={buyer.id}
                          onClick={() => handleBuyerSelect(buyer)}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {buyer.buyerFullName} ({buyer.buyerCountry})
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No recipients found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="buyerFullName"
                    value={buyerDetails.buyerFullName}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="Recipient full name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    name="buyerAddress1"
                    value={buyerDetails.buyerAddress1}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    name="buyerCity"
                    value={buyerDetails.buyerCity}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State/Province</label>
                  <input
                    type="text"
                    name="buyerState"
                    value={buyerDetails.buyerState}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="State or province"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ZIP/Postal Code</label>
                  <input
                    type="text"
                    name="buyerZip"
                    value={buyerDetails.buyerZip}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="ZIP/Postal code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="buyerCountry"
                    value={buyerDetails.buyerCountry}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Code</label>
                  <input
                    type="text"
                    name="phoneCode"
                    value={buyerDetails.phoneCode}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="e.g. +62"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="buyerPhone"
                    value={buyerDetails.buyerPhone}
                    onChange={handleBuyerDetailsChange}
                    className="input w-full"
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Permanent panels are above under pickers; remove duplicate conditional panels */}

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="input w-full"
              placeholder="Order notes..."
            />
          </div>
        </div>

        {/* Package Details */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Package Details</h2>
          
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (grams) *
              </label>
              <input
                type="number"
                name="weightGrams"
                value={formData.weightGrams}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Value *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  name="totalValue"
                  value={formData.totalValue}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="input w-24"
                >
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-1 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package Description *
              </label>
              <input
                type="text"
                name="packageDescription"
                value={formData.packageDescription}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="e.g., Photocard, Document"
                required
              />
            </div>
          </div>

          {/* Optional Dimensions */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Package Dimensions (Optional)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Length (cm)
                </label>
                <input
                  type="number"
                  name="lengthCm"
                  value={formData.lengthCm}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  name="widthCm"
                  value={formData.widthCm}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="heightCm"
                  value={formData.heightCm}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Service *
                </label>
                <select
                  name="service"
                  value={selectedService?.code || ""}
                  onChange={handleServiceChange}
                  className="input w-full"
                  required
                >
                  <option value="">Select service</option>
                  {getAvailableServices().map((service) => (
                    <option key={service.code} value={service.code}>
                      {service.title} - {service.displayAmount || new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: quoteData.meta?.currencyType || 'IDR',
                        maximumFractionDigits: 0,
                      }).format(service.amount)}
                    </option>
                  ))}
                </select>
                {quoteData && getAvailableServices().length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {selectedService ? `Selected: ${selectedService.title}` : 'Please select a service'}
                  </p>
                )}
                {!quoteData && (
                  <p className="text-xs text-gray-500 mt-1">
                    Enter recipient details to calculate
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Shipping Price
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="shippingPriceDisplay"
                    value={selectedService
                      ? (selectedService?.amount || 0).toFixed(2)
                      : formData.shippingPriceMinor ? (parseFloat(formData.shippingPriceMinor) / 100).toFixed(2) : "0.00"
                    }
                    readOnly
                    className="input w-full bg-gray-50"
                    placeholder="0.00"
                  />
                  <span className="text-sm text-gray-600">
                    {quoteData?.meta?.currencyType || 'IDR'}
                  </span>
                </div>
                {selectedService ? (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {selectedService.title} selected
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.shippingPriceMinor && parseFloat(formData.shippingPriceMinor) > 0
                      ? 'Manual price set'
                      : 'Enter recipient details to calculate'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Additional Details (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="SKU"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  HS Code *
                </label>
                <input
                  type="text"
                  name="hsCode"
                  value={formData.hsCode}
                  onChange={handleHsCodeChange}
                  className={`input w-full ${hsCodeError ? 'border-red-500' : hsCodeValidation ? 'border-green-500' : ''}`}
                  placeholder="HS Code"
                  required
                />
                {validatingHsCode && (
                  <p className="text-xs text-blue-500 mt-1">Validating...</p>
                )}
                {hsCodeError && (
                  <p className="text-xs text-red-500 mt-1">{hsCodeError}</p>
                )}
                {hsCodeValidation && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Valid HS Code
                    {hsCodeValidation.data?.description && ` - ${hsCodeValidation.data.description}`}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Country of Origin
                </label>
                <input
                  type="text"
                  name="countryOfOrigin"
                  value={formData.countryOfOrigin}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="Country code"
                  readOnly
                  title="Country of origin is fixed to Indonesia (ID)"
                />
                <p className="text-xs text-gray-500 mt-1">Fixed to Indonesia (ID)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Quote Status */}
        {(buyerDetails.buyerCountry || selectedBuyer?.buyerCountry) && formData.weightGrams && (
          <div className="card p-4 bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Shipping Quote: Indonesia to {getFullCountryName(buyerDetails.buyerCountry || selectedBuyer?.buyerCountry || '')}
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  Weight: {formData.weightGrams}g | Dimensions: {formData.lengthCm || 0}×{formData.widthCm || 0}×{formData.heightCm || 0} cm
                </p>
              </div>
              <div className="text-right">
                {loadingQuote && (
                  <p className="text-sm text-blue-600">Calculating...</p>
                )}
                {quoteError && (
                  <p className="text-sm text-red-600">Error: {quoteError}</p>
                )}
                {quoteData && !loadingQuote && !quoteError && selectedService && (
                  <div>
                    <p className="text-xs text-gray-600">Selected Service</p>
                    <p className="text-lg font-bold text-green-800">
                      {selectedService?.displayAmount ||
                       (typeof selectedService?.amount === 'number'
                         ? new Intl.NumberFormat('id-ID', {
                             style: 'currency',
                             currency: quoteData.meta?.currencyType || 'IDR',
                             maximumFractionDigits: 0,
                           }).format(selectedService?.amount)
                         : '-')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {selectedService?.title}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {quoteData && !loadingQuote && !quoteError && (
              <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Chargeable weight: {quoteData.meta?.chargeableWeight ?? '-'}g</span>
                  <span>Volumetric weight: {quoteData.meta?.volumetricWeight ?? '-'}g</span>
                  <span>Currency: {quoteData.meta?.currencyType || 'IDR'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method *
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="input w-full"
              required
            >
              <option value="qris">QRIS</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href="/orders" className="btn">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}