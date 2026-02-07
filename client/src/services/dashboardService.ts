import axios from 'axios';

export interface DashboardData {
  inventory: {
    totalItems: number;
    available: number;
    reserved: number;
    lowStockItems: number;
    efficiency: number;
    totalValue: number;
  };
  tools: {
    total: number;
    active: number;
    maintenance: number;
    efficiency: number;
    overdueMaintenance: number;
  };
  orders: {
    pending: number;
    processing: number;
    completed: number;
    total: number;
    efficiency: number;
    totalRevenue: number;
  };
  users: {
    active: number;
    total: number;
    newUsers: number;
    efficiency: number;
  };
  sets: {
    total: number;
    active: number;
    inactive: number;
  };
  recentActivity: Array<{
    id: number;
    type: string;
    action: string;
    item: string;
    time: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }>;
  systemMetrics: Array<{
    label: string;
    value: string;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    color: 'success' | 'warning' | 'error' | 'primary';
    icon: string;
  }>;
  lastUpdated: string;
}

class DashboardService {
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  async fetchDashboardData(): Promise<DashboardData> {
    try {
      console.log('🔄 Fetching dashboard data...');
      
      // Fetch all data in parallel for better performance
      const [statsResponse, partsData, toolsData, ordersData, usersData, setsData] = await Promise.all([
        axios.get(`${this.baseURL}/dashboard/analytics`),
        this.fetchPartsData(),
        this.fetchToolsData(),
        this.fetchOrdersData(),
        this.fetchUsersData(),
        this.fetchSetsData()
      ]);
      
      const stats = statsResponse.data;
      console.log('📊 Real dashboard stats received:', stats);

      // Use the comprehensive data from backend
      const backendData = stats.data;
      
      // Map backend data to dashboard format
      const inventory = {
        totalItems: backendData.inventory.totalParts,
        available: backendData.inventory.totalStock,
        reserved: 0, // This would need order data to calculate
        lowStockItems: backendData.inventory.lowStockParts,
        efficiency: backendData.inventory.efficiency,
        totalValue: backendData.inventory.inventoryValue
      };

      const tools = {
        total: backendData.tools.totalTools,
        active: backendData.tools.activeTools,
        maintenance: backendData.tools.maintenanceTools,
        efficiency: backendData.tools.efficiency,
        overdueMaintenance: 0 // Could be calculated from raw data
      };

      const orders = {
        pending: backendData.orders.pendingOrders,
        processing: backendData.orders.processingOrders,
        completed: backendData.orders.completedOrders,
        total: backendData.orders.totalOrders,
        efficiency: backendData.orders.efficiency,
        totalRevenue: backendData.orders.totalRevenue
      };

      const users = {
        active: backendData.users.activeUsers,
        total: backendData.users.totalUsers,
        newUsers: 0, // Could be calculated from raw data
        efficiency: backendData.users.efficiency
      };

      const sets = {
        total: backendData.sets.totalSets,
        active: backendData.sets.activeSets,
        inactive: backendData.sets.inactiveSets
      };

      // Generate recent activity and system metrics using raw data
      const recentActivity = this.generateRecentActivity(
        backendData.rawData.orders, 
        backendData.rawData.parts, 
        backendData.rawData.tools
      );
      const systemMetrics = this.generateSystemMetrics(inventory, tools, orders, users);

      return {
        inventory,
        tools,
        orders,
        users,
        sets,
        recentActivity,
        systemMetrics,
        lastUpdated: new Date().toLocaleString()
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  private async fetchPartsData() {
    try {
      const response = await axios.get(`${this.baseURL}/parts`);
      return response.data.parts || [];
    } catch (error) {
      console.error('Error fetching parts data:', error);
      return [];
    }
  }

  private async fetchToolsData() {
    try {
      const response = await axios.get(`${this.baseURL}/tools`);
      return response.data.tools || [];
    } catch (error) {
      console.error('Error fetching tools data:', error);
      return [];
    }
  }

  private async fetchOrdersData() {
    try {
      const response = await axios.get(`${this.baseURL}/orders`);
      return response.data.orders || [];
    } catch (error) {
      console.error('Error fetching orders data:', error);
      return [];
    }
  }

  private async fetchUsersData() {
    try {
      const response = await axios.get(`${this.baseURL}/users/stats`);
      return response.data.data || { total_users: 0, active_users: 0, new_users: 0 };
    } catch (error) {
      console.error('Error fetching users data:', error);
      return { total_users: 0, active_users: 0, new_users: 0 };
    }
  }

  private async fetchSetsData() {
    try {
      const response = await axios.get(`${this.baseURL}/sets`);
      return response.data.sets || [];
    } catch (error) {
      console.error('Error fetching sets data:', error);
      return [];
    }
  }

  private async fetchAIInventoryData() {
    try {
      const response = await axios.get(`${this.baseURL}/ai/inventory/dashboard`);
      return response.data.data || null;
    } catch (error) {
      console.error('Error fetching AI inventory data:', error);
      return null;
    }
  }

  private calculateInventoryMetrics(parts: any[]) {
    const totalItems = parts.length;
    const available = parts.reduce((sum, part) => sum + (part.stock_quantity || 0), 0);
    const lowStockItems = parts.filter(part => 
      (part.stock_quantity || 0) <= (part.minimum_stock_level || 0)
    ).length;
    const totalValue = parts.reduce((sum, part) => 
      sum + ((part.unit_cost || 0) * (part.stock_quantity || 0)), 0
    );
    
    // Calculate efficiency based on low stock ratio
    const efficiency = totalItems > 0 ? Math.round(((totalItems - lowStockItems) / totalItems) * 100) : 100;
    
    return {
      totalItems,
      available,
      reserved: 0, // This would need order data to calculate
      lowStockItems,
      efficiency,
      totalValue: Math.round(totalValue * 100) / 100
    };
  }

  private calculateToolsMetrics(tools: any[]) {
    const total = tools.length;
    const active = tools.filter(tool => tool.condition_status === 'excellent' || tool.condition_status === 'good').length;
    const maintenance = tools.filter(tool => {
      if (!tool.next_maintenance_date) return false;
      const nextMaintenance = new Date(tool.next_maintenance_date);
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return nextMaintenance <= thirtyDaysFromNow;
    }).length;
    
    const overdueMaintenance = tools.filter(tool => {
      if (!tool.next_maintenance_date) return false;
      const nextMaintenance = new Date(tool.next_maintenance_date);
      const today = new Date();
      return nextMaintenance < today;
    }).length;

    const efficiency = total > 0 ? Math.round((active / total) * 100) : 100;

    return {
      total,
      active,
      maintenance,
      efficiency,
      overdueMaintenance
    };
  }

  private calculateOrdersMetrics(orders: any[]) {
    const total = orders.length;
    const pending = orders.filter(order => order.status === 'pending').length;
    const processing = orders.filter(order => order.status === 'processing').length;
    const completed = orders.filter(order => order.status === 'completed').length;
    const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0);
    
    const efficiency = total > 0 ? Math.round((completed / total) * 100) : 100;

    return {
      pending,
      processing,
      completed,
      total,
      efficiency,
      totalRevenue: Math.round(totalRevenue * 100) / 100
    };
  }

  private calculateUsersMetrics(usersData: any) {
    // Handle both old array format and new stats object format
    if (Array.isArray(usersData)) {
      const total = usersData.length;
      const active = usersData.filter(user => {
        // Consider users active if they have recent activity (last 30 days)
        if (!user.last_login) return false;
        const lastLogin = new Date(user.last_login);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return lastLogin >= thirtyDaysAgo;
      }).length;
      
      const newUsers = usersData.filter(user => {
        if (!user.created_at) return false;
        const created = new Date(user.created_at);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return created >= thirtyDaysAgo;
      }).length;

      const efficiency = total > 0 ? Math.round((active / total) * 100) : 100;

      return {
        active,
        total,
        newUsers,
        efficiency
      };
    } else {
      // New stats object format
      const total = parseInt(usersData.total_users) || 0;
      const active = parseInt(usersData.active_users) || 0;
      const newUsers = parseInt(usersData.new_users) || 0;
      const efficiency = total > 0 ? Math.round((active / total) * 100) : 100;

      return {
        active,
        total,
        newUsers,
        efficiency
      };
    }
  }

  private calculateSetsMetrics(sets: any[]) {
    const total = sets.length;
    const active = sets.filter(set => set.active === true).length;
    const inactive = total - active;

    return {
      total,
      active,
      inactive
    };
  }

  private generateRecentActivity(orders: any[], parts: any[], tools: any[]): any[] {
    const activities: any[] = [];

    // Recent orders
    const recentOrders = orders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
    
    recentOrders.forEach(order => {
      activities.push({
        id: order.order_id,
        type: 'order',
        action: `Order ${order.status}`,
        item: `Order #${order.order_id}`,
        time: this.getTimeAgo(order.created_at),
        status: order.status === 'completed' ? 'success' : 
                order.status === 'processing' ? 'info' : 'warning'
      });
    });

    // Low stock alerts
    const lowStockParts = parts
      .filter(part => (part.stock_quantity || 0) <= (part.minimum_stock_level || 0))
      .slice(0, 2);
    
    lowStockParts.forEach(part => {
      activities.push({
        id: part.part_id,
        type: 'inventory',
        action: 'Low stock alert',
        item: part.part_name || part.part_number || `Part ${part.part_id}`,
        time: this.getTimeAgo(part.updated_at),
        status: 'warning'
      });
    });

    // Maintenance alerts
    const maintenanceTools = tools
      .filter(tool => {
        if (!tool.next_maintenance_date) return false;
        const nextMaintenance = new Date(tool.next_maintenance_date);
        const today = new Date();
        return nextMaintenance <= today;
      })
      .slice(0, 2);
    
    maintenanceTools.forEach(tool => {
      activities.push({
        id: tool.tool_id,
        type: 'maintenance',
        action: 'Maintenance required',
        item: tool.tool_name || tool.tool_number || `Tool ${tool.tool_id}`,
        time: this.getTimeAgo(tool.next_maintenance_date),
        status: 'error'
      });
    });

    return activities.sort((a, b) => {
      // Sort by time (most recent first)
      const timeA = this.parseTimeAgo(a.time);
      const timeB = this.parseTimeAgo(b.time);
      return timeA - timeB;
    }).slice(0, 5);
  }

  private generateSystemMetrics(inventory: any, tools: any, orders: any, users: any) {
    return [
      {
        label: 'System Efficiency',
        value: Math.round((inventory.efficiency + tools.efficiency + orders.efficiency + users.efficiency) / 4).toString(),
        unit: '%',
        trend: 'up' as const,
        color: 'success' as const,
        icon: 'performance'
      },
      {
        label: 'Inventory Health',
        value: inventory.efficiency.toString(),
        unit: '%',
        trend: inventory.efficiency > 80 ? 'up' as const : 'down' as const,
        color: inventory.efficiency > 80 ? 'success' as const : 'warning' as const,
        icon: 'electronics'
      },
      {
        label: 'Order Processing',
        value: orders.efficiency.toString(),
        unit: '%',
        trend: orders.efficiency > 90 ? 'up' as const : 'stable' as const,
        color: orders.efficiency > 90 ? 'success' as const : 'primary' as const,
        icon: 'automation'
      },
      {
        label: 'Tool Availability',
        value: tools.efficiency.toString(),
        unit: '%',
        trend: tools.efficiency > 85 ? 'up' as const : 'down' as const,
        color: tools.efficiency > 85 ? 'success' as const : 'warning' as const,
        icon: 'technology'
      }
    ];
  }

  private getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour ago`;
    return `${Math.floor(diffInSeconds / 86400)} day ago`;
  }

  private parseTimeAgo(timeString: string): number {
    if (timeString === 'Just now') return 0;
    if (timeString.includes('min ago')) return parseInt(timeString) * 60;
    if (timeString.includes('hour ago')) return parseInt(timeString) * 3600;
    if (timeString.includes('day ago')) return parseInt(timeString) * 86400;
    return 999999; // Fallback for unknown formats
  }
}

export const dashboardService = new DashboardService();
