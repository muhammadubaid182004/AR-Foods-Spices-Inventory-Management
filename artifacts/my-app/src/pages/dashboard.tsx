import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import {
  useGetDashboardSummary,
  useGetSalesOverTime,
  useGetSalesByShop,
  useGetSalesByRegion,
  useGetRegions,
  useGetRegionSalesDetail,
  useGetLoadChart
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { DollarSign, Package, MapPin, Store, ClipboardList, CalendarDays } from "lucide-react";

type DayMetrics = {
  date: string;
  sales: number;
  bookings: number;
  unitsMoved: number;
};

const toDateInputValue = (date: Date): string => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const fetchDayMetrics = async (date: string): Promise<DayMetrics> => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const endpoint = `/api/dashboard/day-metrics?date=${encodeURIComponent(date)}`;
  const url = apiBaseUrl ? `${apiBaseUrl}${endpoint}` : endpoint;
  const token = localStorage.getItem("auth_token");

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Failed to load day metrics");
  }

  return response.json() as Promise<DayMetrics>;
};

const formatItemPriceOptionLabel = (itemName: string, priceOption: string) =>
  `${itemName} - ${priceOption} Rs Packet`;

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: salesOverTime } = useGetSalesOverTime();
  const { data: salesByShop } = useGetSalesByShop();
  const { data: salesByRegion } = useGetSalesByRegion();
  const { data: regions } = useGetRegions();

  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(new Date()));

  const today = toDateInputValue(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateInputValue(yesterdayDate);

  const { data: todayMetrics } = useQuery({
    queryKey: ["dashboard-day-metrics", today],
    queryFn: () => fetchDayMetrics(today),
  });

  const { data: yesterdayMetrics } = useQuery({
    queryKey: ["dashboard-day-metrics", yesterday],
    queryFn: () => fetchDayMetrics(yesterday),
  });

  const {
    data: selectedDateMetrics,
    isLoading: isSelectedDateMetricsLoading,
    isFetching: isSelectedDateMetricsFetching,
  } = useQuery({
    queryKey: ["dashboard-day-metrics", selectedDate],
    queryFn: () => fetchDayMetrics(selectedDate),
    enabled: Boolean(selectedDate),
  });

  const { data: regionSalesDetail } = useGetRegionSalesDetail(
    { regionId: parseInt(selectedRegionId) },
    { query: { enabled: !!selectedRegionId } }
  );

  const {
    data: loadChartData,
    isLoading: isLoadChartLoading,
    isFetching: isLoadChartFetching,
  } = useGetLoadChart({
    month: selectedMonth && selectedMonth !== "all" ? parseInt(selectedMonth) : undefined,
    year: selectedYear && selectedYear !== "all" ? parseInt(selectedYear) : undefined,
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  useEffect(() => {
    if (!regions || regions.length === 0) return;
    const regionList = regions as Array<{ id: number; shopCount: number }>;

    let selectedExists = false;
    for (const region of regionList) {
      if (region.id.toString() === selectedRegionId) {
        selectedExists = true;
        break;
      }
    }
    if (selectedExists) return;

    let regionWithMostShops = regionList[0];
    for (const region of regionList) {
      if (region.shopCount > regionWithMostShops.shopCount) {
        regionWithMostShops = region;
      }
    }

    setSelectedRegionId(regionWithMostShops.id.toString());
  }, [regions, selectedRegionId]);

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const formatCurrency = (val: number) => `₨${val.toLocaleString()}`;
  const formatItemsWithDozens = (itemCount: number) => {
    const dozens = itemCount / 12;
    const formattedDozens =
      Number.isInteger(dozens)
        ? dozens.toLocaleString()
        : dozens.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const dozenLabel = dozens === 1 ? "dozen" : "dozens";
    return `${itemCount.toLocaleString()} items (${formattedDozens} ${dozenLabel})`;
  };

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

        {/* ── Daily Booking Cards ── */}
        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-5 md:mb-8"
        >
          {[
            {
              label: "Bookings Today",
              value: todayMetrics ? todayMetrics.bookings.toLocaleString() : "—",
              icon: ClipboardList,
              bg: "bg-emerald-500/20",
              color: "text-emerald-400",
            },
            {
              label: "Units Moved Today",
              value: todayMetrics ? todayMetrics.unitsMoved.toLocaleString() : "—",
              icon: Package,
              bg: "bg-cyan-500/20",
              color: "text-cyan-400",
            },
            {
              label: "Bookings Yesterday",
              value: yesterdayMetrics ? yesterdayMetrics.bookings.toLocaleString() : "—",
              icon: CalendarDays,
              bg: "bg-amber-500/20",
              color: "text-amber-400",
            },
            {
              label: "Units Moved Yesterday",
              value: yesterdayMetrics ? yesterdayMetrics.unitsMoved.toLocaleString() : "—",
              icon: Package,
              bg: "bg-indigo-500/20",
              color: "text-indigo-400",
            },
          ].map(({ label, value, icon: Icon, bg, color }) => (
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

        {/* ── Date Picker Daily Metrics ── */}
        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="mb-4 md:mb-6"
        >
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 pt-4 pb-2 md:px-6 md:pt-6">
                <CardTitle className="text-sm md:text-lg font-medium text-foreground">
                  Sales and Units Moved by Date
                </CardTitle>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 md:h-10 w-full md:w-auto rounded-md border border-white/20 bg-slate-900 px-3 text-xs md:text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60"
                />
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
                {isSelectedDateMetricsLoading || isSelectedDateMetricsFetching ? (
                  <p className="text-xs md:text-sm text-muted-foreground">Loading selected date metrics...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-white/10 bg-background/30 p-3">
                      <p className="text-[11px] md:text-xs uppercase tracking-wider text-muted-foreground">Sales</p>
                      <p className="text-lg md:text-2xl font-semibold text-foreground">
                        {selectedDateMetrics ? formatCurrency(selectedDateMetrics.sales) : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-background/30 p-3">
                      <p className="text-[11px] md:text-xs uppercase tracking-wider text-muted-foreground">Units Moved</p>
                      <p className="text-lg md:text-2xl font-semibold text-foreground">
                        {selectedDateMetrics ? selectedDateMetrics.unitsMoved.toLocaleString() : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-background/30 p-3">
                      <p className="text-[11px] md:text-xs uppercase tracking-wider text-muted-foreground">Bookings</p>
                      <p className="text-lg md:text-2xl font-semibold text-foreground">
                        {selectedDateMetrics ? selectedDateMetrics.bookings.toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── Load Chart ── */}
        <motion.div
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="mb-4 md:mb-6"
        >
          <motion.div variants={itemVars}>
            <Card className="bg-card/40 border-white/5 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 pt-4 pb-2 md:px-6 md:pt-6">
                <CardTitle className="text-sm md:text-lg font-medium text-foreground whitespace-nowrap">
                  Load Chart
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedMonth || "all"} onValueChange={(v) => setSelectedMonth(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[120px] md:w-[140px] bg-background/50 border-white/10 text-xs md:text-sm h-8 md:h-10">
                      <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear || "all"} onValueChange={(v) => setSelectedYear(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[100px] md:w-[120px] bg-background/50 border-white/10 text-xs md:text-sm h-8 md:h-10">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth("");
                      setSelectedYear("");
                    }}
                    className="h-8 md:h-10 px-3 rounded-md border border-white/10 bg-background/50 text-xs md:text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </CardHeader>
              <CardContent className="px-1 md:px-4 pb-4">
                {(selectedMonth || selectedYear) && (
                  <div className="px-3 md:px-1 pb-2 text-[11px] md:text-xs text-muted-foreground">
                    Showing results for{" "}
                    <span className="text-foreground font-medium">
                      {selectedMonth ? months.find((m) => m.value === selectedMonth)?.label : "All Months"}
                    </span>
                    {" / "}
                    <span className="text-foreground font-medium">{selectedYear || "All Years"}</span>
                  </div>
                )}
                <div className="max-h-[280px] md:max-h-[320px] overflow-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur">
                      <TableRow className="border-white/10">
                        <TableHead className="text-muted-foreground text-xs md:text-sm w-14 text-center">Rank</TableHead>
                        <TableHead className="text-muted-foreground text-xs md:text-sm text-center">Price Option</TableHead>
                        <TableHead className="text-muted-foreground text-xs md:text-sm text-center">Qty Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadChartLoading || isLoadChartFetching ? (
                        <TableRow className="border-white/10">
                          <TableCell colSpan={3} className="text-center text-muted-foreground text-xs md:text-sm py-8">
                            Loading sales data...
                          </TableCell>
                        </TableRow>
                      ) : !loadChartData || loadChartData.length === 0 ? (
                        <TableRow className="border-white/10">
                          <TableCell colSpan={3} className="text-center text-muted-foreground text-xs md:text-sm py-8">
                            No sales data for this filter. Try selecting another month/year.
                          </TableCell>
                        </TableRow>
                      ) : (
                        loadChartData.map((item, index) => (
                          <TableRow key={`${item.itemId}-${item.priceOption}`} className="border-white/10 odd:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                            <TableCell className="text-foreground text-xs md:text-sm text-center">
                              <span className="inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
                                {index + 1}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground text-xs md:text-sm font-medium text-center">
                              {formatItemPriceOptionLabel(item.itemName, item.priceOption)}
                            </TableCell>
                            <TableCell className="text-foreground text-xs md:text-sm font-medium text-center">
                              <span className="inline-flex items-center rounded-md bg-emerald-500/15 text-emerald-400 px-2 py-0.5">
                                {formatItemsWithDozens(item.quantitySold)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── Graphs ──
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
                      <YAxis {...axisProps} tickFormatter={(val) => `₨${val / 1000}k`} width={45} />
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
                      <XAxis type="number" {...axisProps} tickFormatter={(val) => `₨${val / 1000}k`} />
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
                        <YAxis {...axisProps} tickFormatter={(val) => `₨${val / 1000}k`} width={45} />
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
                      <YAxis {...axisProps} tickFormatter={(val) => `₨${val / 1000}k`} width={45} />
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
