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
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const formatCurrency = (val: number) => `$${val.toLocaleString()}`;

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "#0D0F14",
      borderColor: "rgba(255,255,255,0.1)",
      borderRadius: "8px",
      fontSize: "12px",
    },
    itemStyle: { color: "hsl(var(--foreground))" },
  };

  const axisProps = {
    stroke: "rgba(255,255,255,0.3)",
    tick: { fill: "rgba(255,255,255,0.5)", fontSize: 11 },
    tickLine: false as const,
    axisLine: false as const,
  };

  const summaryCards = [
    {
      label: "Total Revenue",
      value: summary ? formatCurrency(summary.totalSales) : "—",
      icon: DollarSign,
      bg: "bg-primary/20",
      color: "text-primary",
    },
    {
      label: "Units Moved",
      value: summary ? summary.totalItemsSold.toLocaleString() : "—",
      icon: Package,
      bg: "bg-blue-500/20",
      color: "text-blue-500",
    },
    {
      label: "Active Regions",
      value: summary ? summary.totalRegions : "—",
      icon: MapPin,
      bg: "bg-purple-500/20",
      color: "text-purple-500",
    },
    {
      label: "Total Shops",
      value: summary ? summary.totalShops : "—",
      icon: Store,
      bg: "bg-teal-500/20",
      color: "text-teal-500",
    },
  ];

  return (
    <Layout>
      {/* Page padding: tight on mobile, generous on desktop */}
      <div className="px-4 py-5 md:px-8 md:py-8 pb-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 md:mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Real-time overview of your network performance.
          </p>
        </motion.div>

        {/* ── Summary Cards ──
              Mobile : 2-column grid, compact padding & text
              Desktop: 4-column grid, original sizing
        ── */}
        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-5 md:mb-8"
        >
          {summaryCards.map(({ label, value, icon: Icon, bg, color }) => (
            <motion.div key={label} variants={itemVars}>
              <Card className="bg-card/40 border-white/5 backdrop-blur-sm shadow-xl hover:bg-card/60 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 md:pb-2 md:pt-6 md:px-6">
                  <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider leading-tight">
                    {label}
                  </CardTitle>
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${color}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
                  <div className="text-xl md:text-3xl font-bold text-foreground truncate">
                    {value}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Charts ──
              Mobile : single-column, 220px chart height
              Desktop: 2-column, 300px chart height
        ── */}
        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
        >

          {/* Network Revenue Flow */}
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6 md:pt-6">
                <CardTitle className="text-sm md:text-lg font-medium text-foreground">
                  Network Revenue Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] md:h-[300px] px-1 md:px-4 pb-4">
                {salesOverTime && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesOverTime}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="month" {...axisProps} tickFormatter={(v) => v.slice(0, 3)} />
                      <YAxis {...axisProps} tickFormatter={(val) => `$${val / 1000}k`} width={45} />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                      />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Revenue by Territory */}
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6 md:pt-6">
                <CardTitle className="text-sm md:text-lg font-medium text-foreground">
                  Revenue by Territory
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] md:h-[300px] px-1 md:px-4 pb-4">
                {salesByRegion && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByRegion} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" {...axisProps} tickFormatter={(val) => `$${val / 1000}k`} />
                      <YAxis dataKey="regionName" type="category" {...axisProps} width={70} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.02)" }}
                        {...tooltipStyle}
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
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pt-4 pb-2 md:px-6 md:pt-6">
                <CardTitle className="text-sm md:text-lg font-medium text-foreground whitespace-nowrap">
                  Regional Drilldown
                </CardTitle>
                <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                  <SelectTrigger className="w-[140px] md:w-[180px] bg-background/50 border-white/10 text-xs md:text-sm h-8 md:h-10">
                    <SelectValue placeholder="Select Territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions?.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="h-[220px] md:h-[280px] px-1 md:px-4 pb-4">
                {!selectedRegionId ? (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs md:text-sm border border-dashed border-white/5 rounded-lg">
                    Select a territory to view performance
                  </div>
                ) : (
                  regionSalesDetail && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={regionSalesDetail}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="month" {...axisProps} tickFormatter={(v) => v.slice(0, 3)} />
                        <YAxis {...axisProps} tickFormatter={(val) => `$${val / 1000}k`} width={45} />
                        <Tooltip
                          {...tooltipStyle}
                          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        />
                        <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Performing Shops */}
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6 md:pt-6">
                <CardTitle className="text-sm md:text-lg font-medium text-foreground">
                  Top Performing Shops
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] md:h-[300px] px-1 md:px-4 pb-4">
                {salesByShop && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByShop.slice(0, 6)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="shopName"
                        {...axisProps}
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 9 }}
                        interval={0}
                        tickFormatter={(v: string) => v.length > 6 ? v.slice(0, 6) + "…" : v}
                      />
                      <YAxis {...axisProps} tickFormatter={(val) => `$${val / 1000}k`} width={45} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.02)" }}
                        {...tooltipStyle}
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