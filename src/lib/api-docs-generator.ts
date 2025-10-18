import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  responses?: { code: number; description: string }[];
  example?: any;
  category: string;
}

interface RouteAnalysis {
  endpoints: ApiEndpoint[];
  lastModified: Date;
}

const ROUTE_PATTERNS = {
  // Common patterns for extracting information from route files
  description: /\/\*\*\s*\n\s*\*\s*(.+?)\n/m,
  paramValidation: /if\s*\(!(\w+)\)/g,
  bodyFields: /const\s*{\s*([^}]+)\s*}\s*=\s*body;/,
  errorResponses: /NextResponse\.json\(\s*\{\s*error:\s*["'`]([^"'`]+)["'`]/g,
  successResponses: /NextResponse\.json\(([^,)]+)/g,
  methodExports: /export\s+async\s+function\s+(GET|POST|PUT|DELETE)/g
};

const DEFAULT_RESPONSES = {
  GET: [
    { code: 200, description: 'Success - Returns data' },
    { code: 404, description: 'Not Found - Resource not found' },
    { code: 500, description: 'Internal server error' }
  ],
  POST: [
    { code: 201, description: 'Created - Resource created successfully' },
    { code: 400, description: 'Bad Request - Invalid input data' },
    { code: 409, description: 'Conflict - Resource already exists' },
    { code: 500, description: 'Internal server error' }
  ],
  PUT: [
    { code: 200, description: 'Success - Resource updated successfully' },
    { code: 400, description: 'Bad Request - Invalid input data' },
    { code: 404, description: 'Not Found - Resource not found' },
    { code: 500, description: 'Internal server error' }
  ],
  DELETE: [
    { code: 200, description: 'Success - Resource deleted successfully' },
    { code: 400, description: 'Bad Request - Cannot delete resource' },
    { code: 404, description: 'Not Found - Resource not found' },
    { code: 500, description: 'Internal server error' }
  ]
};

const EXAMPLES = {
  'POST /api/buyers': {
    saleRecordNumber: "2190",
    buyerFullName: "John Doe",
    buyerAddress1: "123 Main St",
    buyerAddress2: "Apt 4B",
    buyerCity: "New York",
    buyerState: "NY",
    buyerZip: "10001",
    buyerCountry: "United States",
    buyerPhone: "555-123-4567",
    phoneCode: "+1"
  },
  'POST /api/customers': {
    name: "Jane Smith",
    phone: "555-987-6543",
    phoneCode: "+1",
    shopeeName: "janesmith_shop"
  },
  'POST /api/orders': {
    customerId: "cus_123",
    buyerId: 1,
    service: "EP",
    notes: "Handle with care",
    weightGrams: 500,
    totalValue: 25.99,
    packageDescription: "Electronics",
    lengthCm: 10,
    widthCm: 10,
    heightCm: 5,
    quotedAmountMinor: 2599,
    shippingPriceMinor: 1299,
    currency: "USD",
    paymentMethod: "qris",
    sku: "ELEC-001",
    hsCode: "490900",
    countryOfOrigin: "ID"
  },
  'POST /api/kurasi/login': {
    username: "your_username",
    password: "your_password"
  },
  'POST /api/kurasi/quote': {
    country: "US",
    actualWeight: "500",
    actualHeight: "10",
    actualLength: "10",
    actualWidth: "10",
    currencyType: "USD",
    supportedCountryCode: "US"
  },
  'POST /api/kurasi/shipment': {
    orderId: "order_123"
  }
};

class ApiDocsGenerator {
  private cache: Map<string, RouteAnalysis> = new Map();
  private apiBasePath: string;

  constructor(apiBasePath: string = 'src/app/api') {
    this.apiBasePath = apiBasePath;
  }

  private extractRouteInfo(filePath: string, routePath: string): ApiEndpoint[] {
    const content = readFileSync(filePath, 'utf-8');
    const endpoints: ApiEndpoint[] = [];
    
    // Extract methods from the file
    const methods = [...content.matchAll(ROUTE_PATTERNS.methodExports)];
    
    if (methods.length === 0) {
      return endpoints;
    }

    // Extract description from comments
    const descriptionMatch = content.match(ROUTE_PATTERNS.description);
    const baseDescription = descriptionMatch ? descriptionMatch[1] : this.generateDescriptionFromPath(routePath);

    // Extract error messages for better descriptions
    const errorMessages = [...content.matchAll(ROUTE_PATTERNS.errorResponses)]
      .map(match => match[1]);

    // Extract body fields for POST/PUT requests
    const bodyFieldsMatch = content.match(ROUTE_PATTERNS.bodyFields);
    const bodyFields = bodyFieldsMatch ? this.parseBodyFields(bodyFieldsMatch[1]) : [];

    // Extract parameter validations
    const paramValidations = [...content.matchAll(ROUTE_PATTERNS.paramValidation)]
      .map(match => match[1]);

    methods.forEach((methodMatch) => {
      const method = methodMatch[1];
      const fullPath = method === 'GET' && content.includes('searchParams') 
        ? `${routePath}?param=value`
        : routePath;

      const endpoint: ApiEndpoint = {
        method,
        path: fullPath,
        description: this.generateMethodDescription(method, baseDescription, routePath),
        category: this.getCategoryFromPath(routePath),
        responses: DEFAULT_RESPONSES[method as keyof typeof DEFAULT_RESPONSES] || []
      };

      // Add parameters for dynamic routes
      if (routePath.includes('[id]')) {
        endpoint.parameters = [
          {
            name: 'id',
            type: 'string',
            required: true,
            description: 'Resource ID'
          }
        ];
      }

      // Add query parameters for GET endpoints
      if (method === 'GET' && content.includes('searchParams')) {
        const queryParams = this.extractQueryParameters(content);
        if (queryParams.length > 0) {
          endpoint.parameters = [...(endpoint.parameters || []), ...queryParams];
        }
      }

      // Add body fields for POST/PUT
      if ((method === 'POST' || method === 'PUT') && bodyFields.length > 0) {
        endpoint.body = bodyFields;
        endpoint.example = EXAMPLES[`${method} ${routePath}` as keyof typeof EXAMPLES];
      }

      endpoints.push(endpoint);
    });

    return endpoints;
  }

  private parseBodyFields(fieldsString: string): { name: string; type: string; required: boolean; description: string }[] {
    const fields = fieldsString.split(',').map(f => f.trim());
    return fields.map(field => {
      const name = field;
      const type = this.inferTypeFromName(name);
      const required = this.isRequiredField(name);
      const description = this.generateFieldDescription(name);
      
      return { name, type, required, description };
    });
  }

  private extractQueryParameters(content: string): { name: string; type: string; required: boolean; description: string }[] {
    const params: { name: string; type: string; required: boolean; description: string }[] = [];
    
    // Look for common query parameter patterns
    if (content.includes('searchParams.get(')) {
      const paramMatches = [...content.matchAll(/searchParams\.get\(['"`]([^'"`]+)['"`]\)/g)];
      paramMatches.forEach(match => {
        const name = match[1];
        params.push({
          name,
          type: this.inferTypeFromName(name),
          required: false,
          description: this.generateFieldDescription(name)
        });
      });
    }

    return params;
  }

  private inferTypeFromName(name: string): string {
    if (name.includes('id') || name.includes('Id')) return 'string';
    if (name.includes('Number') || name.includes('Amount') || name.includes('Price') || name.includes('Weight') || name.includes('Value')) return 'number';
    if (name.includes('Date') || name.includes('At')) return 'string';
    if (name.includes('is') || name.includes('has') || name.includes('can')) return 'boolean';
    return 'string';
  }

  private isRequiredField(name: string): boolean {
    const commonRequired = ['id', 'name', 'email', 'phone', 'customerId', 'buyerId', 'service'];
    return commonRequired.some(req => name.toLowerCase().includes(req.toLowerCase()));
  }

  private generateFieldDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'saleRecordNumber': 'Unique sale record number',
      'buyerFullName': 'Full name of the buyer',
      'buyerAddress1': 'Primary address line',
      'buyerAddress2': 'Secondary address line',
      'buyerCity': 'City name',
      'buyerState': 'State/Province',
      'buyerZip': 'Postal/ZIP code',
      'buyerCountry': 'Country name',
      'buyerPhone': 'Phone number',
      'phoneCode': 'Phone country code',
      'name': 'Name',
      'phone': 'Phone number',
      'shopeeName': 'Shopee username',
      'customerId': 'Customer ID',
      'buyerId': 'Buyer ID',
      'service': 'Shipping service type',
      'notes': 'Order notes',
      'weightGrams': 'Package weight in grams',
      'totalValue': 'Total package value',
      'packageDescription': 'Package description',
      'lengthCm': 'Package length in cm',
      'widthCm': 'Package width in cm',
      'heightCm': 'Package height in cm',
      'quotedAmountMinor': 'Quoted amount in minor units',
      'shippingPriceMinor': 'Shipping price in minor units',
      'currency': 'Currency code',
      'paymentMethod': 'Payment method',
      'sku': 'Product SKU',
      'hsCode': 'HS Code',
      'countryOfOrigin': 'Country of origin',
      'status': 'Filter by status',
      'page': 'Page number',
      'limit': 'Items per page',
      'username': 'Username',
      'password': 'Password',
      'country': 'Destination country',
      'actualWeight': 'Package weight',
      'actualHeight': 'Package height',
      'actualLength': 'Package length',
      'actualWidth': 'Package width',
      'currencyType': 'Currency type',
      'supportedCountryCode': 'Supported country code',
      'orderId': 'Order ID to create shipment for',
      'hsCodeParam': 'HS Code to validate'
    };

    return descriptions[name] || name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1').trim();
  }

  private generateDescriptionFromPath(routePath: string): string {
    const pathParts = routePath.split('/').filter(part => part && part !== 'api');
    const resource = pathParts[0];
    
    const descriptions: Record<string, string> = {
      'buyers': 'Manage buyers in the system',
      'customers': 'Manage customers in the system',
      'orders': 'Manage orders in the system',
      'dashboard': 'Get dashboard statistics',
      'next-srn': 'Get next sale record number',
      'kurasi': 'Kurasi shipping integration'
    };

    return descriptions[resource] || `Manage ${resource}`;
  }

  private generateMethodDescription(method: string, baseDescription: string, routePath: string): string {
    const action = {
      GET: routePath.includes('[id]') ? 'Get specific' : 'Get all',
      POST: 'Create',
      PUT: 'Update',
      DELETE: 'Delete'
    };

    const resource = routePath.split('/').filter(part => part && part !== 'api')[0];
    
    if (method === 'GET' && routePath.includes('[id]')) {
      return `${action.GET} ${resource.slice(0, -1)} by ID`;
    }
    
    return `${action[method as keyof typeof action]} ${resource}`;
  }

  private getCategoryFromPath(routePath: string): string {
    const pathParts = routePath.split('/').filter(part => part && part !== 'api');
    const mainCategory = pathParts[0];
    
    const categories: Record<string, string> = {
      'buyers': 'Buyers Management',
      'customers': 'Customers Management',
      'orders': 'Orders Management',
      'dashboard': 'Dashboard & Utilities',
      'next-srn': 'Dashboard & Utilities',
      'kurasi': 'Kurasi Integration'
    };

    return categories[mainCategory] || 'Other';
  }

  private scanDirectory(dirPath: string, basePath: string = ''): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip directories that are not route directories
          if (item.startsWith('.') || item === 'node_modules') {
            continue;
          }
          
          const newBasePath = basePath ? `${basePath}/${item}` : item;
          endpoints.push(...this.scanDirectory(fullPath, newBasePath));
        } else if (item === 'route.ts') {
          // This is a route file
          const routePath = `/api/${basePath}`;
          const fileStats = statSync(fullPath);
          
          // Check if we have cached data and if the file hasn't been modified
          const cacheKey = fullPath;
          const cached = this.cache.get(cacheKey);
          
          if (cached && cached.lastModified >= fileStats.mtime) {
            endpoints.push(...cached.endpoints);
          } else {
            const routeEndpoints = this.extractRouteInfo(fullPath, routePath);
            this.cache.set(cacheKey, {
              endpoints: routeEndpoints,
              lastModified: fileStats.mtime
            });
            endpoints.push(...routeEndpoints);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error);
    }
    
    return endpoints;
  }

  public generateDocumentation(): ApiEndpoint[] {
    const fullPath = join(process.cwd(), this.apiBasePath);
    return this.scanDirectory(fullPath);
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const apiDocsGenerator = new ApiDocsGenerator();
export type { ApiEndpoint };