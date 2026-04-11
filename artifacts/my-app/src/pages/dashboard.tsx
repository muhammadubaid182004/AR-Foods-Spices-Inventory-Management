import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  useGetDashboardSummary, 
  useGetSalesOverTime, 
  useGetSalesByShop,
  useGetSalesByRegion,
  useGetRegions,
  useGetRegionSalesDetail
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { DollarSign, Package, MapPin, Store } from "lucide-react";

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: salesOverTime } = useGetSalesOverTime();
  const { data: salesByShop } = useGetSalesByShop();
  const { data: salesByRegion } = useGetSalesByRegion();
  const { data: regions } = useGetRegions();

  const [selectedRegionId, setSelectedRegionId] = useState<string>("");

  const { data: regionSalesDetail } = useGetRegionSalesDetail(
    { regionId: parseInt(selectedRegionId) },
    { query: { enabled: !!selectedRegionId } }
  );

  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

  return (
    <Layout>
      <div className="p-8 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your network performance.</p>
        </motion.div>

        {/* Summary Cards */}
        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-xl hover:bg-card/60 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {summary ? formatCurrency(summary.totalSales) : "..."}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-xl hover:bg-card/60 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Units Moved</CardTitle>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {summary ? summary.totalItemsSold.toLocaleString() : "..."}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-xl hover:bg-card/60 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Regions</CardTitle>
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {summary ? summary.totalRegions : "..."}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-xl hover:bg-card/60 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Shops</CardTitle>
                <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <Store className="w-4 h-4 text-teal-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {summary ? summary.totalShops : "..."}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Charts */}
        <motion.div 
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Global Revenue Over Time */}
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm h-[400px]">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-foreground">Network Revenue Flow</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {salesOverTime && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesOverTime}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0D0F14', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sales by Region */}
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm h-[400px]">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-foreground">Revenue by Territory</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {salesByRegion && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByRegion} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                      <YAxis dataKey="regionName" type="category" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.02)'}}
                        contentStyle={{ backgroundColor: '#0D0F14', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Regional Drilldown */}
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm h-[400px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-medium text-foreground">Regional Drilldown</CardTitle>
                <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                  <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
                    <SelectValue placeholder="Select Territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions?.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-[280px]">
                {!selectedRegionId ? (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm border border-dashed border-white/5 rounded-lg">
                    Select a territory to view performance
                  </div>
                ) : (
                  regionSalesDetail && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={regionSalesDetail}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0D0F14', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        />
                        <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 0}} activeDot={{r: 6, strokeWidth: 0}} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Shops */}
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm h-[400px]">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-foreground">Top Performing Shops</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {salesByShop && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByShop.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="shopName" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 11}} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                      <Tooltip 
                        cursor={{fill: 'rgba(255,255,255,0.02)'}}
                        contentStyle={{ backgroundColor: '#0D0F14', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Bar dataKey="sales" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}
