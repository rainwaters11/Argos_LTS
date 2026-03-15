import React, { useMemo, useState, createContext, useContext } from "react";
import {
  Shield, Activity, ArrowRightLeft, ExternalLink, Coins, Gauge,
  Radar, CheckCircle2, AlertTriangle, Waves, Copy, Wallet, RefreshCw,
} from "lucide-react";

const Card = ({ className = "", children }) => (
  <div className={`rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-sm ${className}`}>{children}</div>
);
const CardHeader = ({ className = "", children }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
);
const CardTitle = ({ className = "", children }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);
const CardDescription = ({ className = "", children }) => (
  <p className={`text-sm text-slate-500 ${className}`}>{children}</p>
);
const CardContent = ({ className = "", children }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);
const Badge = ({ className = "", variant = "default", children }) => {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variants = { default: "border-transparent bg-slate-900 text-slate-50 shadow hover:bg-slate-800", outline: "text-slate-950 border-slate-200" };
  return <div className={`${base} ${variants[variant] || ""} ${className}`}>{children}</div>;
};
const Button = ({ children, variant = "default", className = "", onClick, disabled }) => {
  const base = "inline-flex items-center justify-center text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
  const variants = { default: "bg-slate-900 text-white hover:bg-slate-800", outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900" };
  return <button className={`${base} ${variants[variant]} h-10 px-4 py-2 ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
};
const Input = ({ className = "", ...props }) => (
  <input className={`flex h-10 w-full rounded-2xl border border-slate-200 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} />
);
const Progress = ({ value, className = "" }) => (
  <div className={`relative h-4 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
    <div className="h-full w-full flex-1 bg-slate-900 transition-all duration-500 ease-in-out" style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
  </div>
);
const TabsContext = createContext();
const Tabs = ({ defaultValue, children, className = "" }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return <TabsContext.Provider value={{ activeTab, setActiveTab }}><div className={className}>{children}</div></TabsContext.Provider>;
};
const TabsList = ({ children, className = "" }) => (
  <div className={`inline-flex items-center justify-center rounded-2xl bg-slate-100 p-1 ${className}`}>{children}</div>
);
const TabsTrigger = ({ value, children, className = "" }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button onClick={() => setActiveTab(value)} className={`inline-flex items-center justify-center whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition-all ${isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"} ${className}`}>{children}</button>
  );
};
const TabsContent = ({ value, children, className = "" }) => {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div className={`mt-4 ${className}`}>{children}</div>;
};

const contracts = {
  argos:   "0xCd6606e077b271316d09De8521ADBE72f8eB4088",
  adapter: "0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B",
  mLST:    "0x1b46779584a8BFaE6F77418F6c3024FBA9e7B92a",
  mWETH:   "0xA740013D461B6EEE7E774CAd7f5d049919AC801B",
};
const pool = { id: "0xc729b4764ab9a33ec1992c9e506f4f3e3ab9ec29e89833a57eba92e41eebf21e", fee: 3000, tickSpacing: 60, price: "1:1", chainId: 1301, network: "Unichain Sepolia", callbackProxy: "0x9299472A6399Fd1027ebF067571Eb3e3D7837FC4" };
const verifiedState = { riskController: contracts.adapter, approvedPool: true, marketConfigured: true, enabled: true, riskState: "Safe", maxAbsAmount: "0" };
const txs = [
  { label: "Pool init + seed liquidity",   hash: "0x0bd0058b1bb3efb72d37aa61dc36bc336e8dcc3087dc1c8aa517e32ace084c4f", block: 46739974 },
  { label: "configureMarket",              hash: "0x6949762f3b06c8fab1212c41f40ea06165c5db5855c473083b48240703926ac5", block: 46740065 },
  { label: "setRiskController to adapter", hash: "0x41892685f69ccca6d1c3cf7d1a850eceb48c63e1f302f2a5897e5097c8a86611", block: 46740098 },
  { label: "setApprovedPool demo pool",    hash: "0xbe710d77dcf721e8aa3ff4bde73b6eca88f3c03014565c208c1208ea81bbf428", block: 46740098 },
  { label: "Reactive signal Blocked",      hash: "0xa2aef720ddb32b7eba77ff1a27515aecb4b03b32a37c4adae690319df9d0c5fc", block: 46741627 },
  { label: "Owner reset Safe",             hash: "0x6735114cf9f5fb887c21d8302e5be721832ae78d77ebe9a76bcab8d6e3c3a1e4", block: 46741627 },
];
const short = (v) => `${v.slice(0,6)}...${v.slice(-4)}`;
const explorer = (p) => `https://sepolia.uniscan.xyz/${p}`;

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <Card><CardContent className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3"><Icon className="h-5 w-5 text-slate-700" /></div>
      </div>
    </CardContent></Card>
  );
}

function ContractRow({ label, address }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const el = document.createElement("textarea"); el.value = address;
    document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div><div className="text-sm font-medium text-slate-900">{label}</div><div className="text-xs text-slate-500">{short(address)}</div></div>
      <div className="flex gap-2">
        <Button variant="outline" className="rounded-2xl" onClick={handleCopy}><Copy className="mr-2 h-4 w-4" />{copied ? "Copied" : "Copy"}</Button>
        <a href={explorer(`address/${address}`)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100">View<ExternalLink className="ml-2 h-4 w-4" /></a>
      </div>
    </div>
  );
}

export default function App() {
  const [threshold, setThreshold] = useState("500000");
  const [simulatedTransfer, setSimulatedTransfer] = useState("750000");
  const [demoRiskState, setDemoRiskState] = useState("Safe");

  const callbackStatus = useMemo(() => Number(simulatedTransfer||0) > Number(threshold||0) ? "Triggered" : "Idle", [simulatedTransfer, threshold]);
  const thresholdPercent = useMemo(() => Math.min(100, Math.round((Number(simulatedTransfer||0) / Math.max(Number(threshold||1),1)) * 100)), [simulatedTransfer, threshold]);

  const riskBadge = (s) => s === "Safe" ? "bg-emerald-100 text-emerald-700" : s === "Restricted" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white">Argos Dashboard</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">{pool.network}</Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">Chain ID {pool.chainId}</Badge>
                <Badge className={`rounded-full px-3 py-1 border-0 ${riskBadge(verifiedState.riskState)}`}>Verified On-Chain Risk: {verifiedState.riskState}</Badge>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Cross-chain protection for a live Unichain liquidity pool.</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Argos protects a live mLST / mWETH pool using a Uniswap v4 hook, a destination-side Reactive adapter, and a callback-aware risk update path.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-2xl px-5"><Wallet className="mr-2 h-4 w-4" />Connected: 0xfB9f...38f4</Button>
              <a href={explorer(`address/${contracts.argos}`)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100">View Hook<ExternalLink className="ml-2 h-4 w-4" /></a>
              <a href={explorer(`address/${contracts.adapter}`)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100">View Adapter<ExternalLink className="ml-2 h-4 w-4" /></a>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
          <div className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Verified state mode</div>
          <div className="mt-1 opacity-90">This dashboard uses the verified on-chain values from the completed Unichain Sepolia demo run and a local UI simulation panel for the Reactive callback flow.</div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Verified Risk State" value={verifiedState.riskState} description="Pulled from on-chain state" icon={Shield} />
          <StatCard title="Pool Fee" value="0.30%" description="Configured Uniswap v4 fee tier" icon={Gauge} />
          <StatCard title="Liquidity Seeded" value="20,000" description="10,000 mLST + 10,000 mWETH" icon={Coins} />
          <StatCard title="Reactive Callback" value={callbackStatus} description="Threshold-based simulation" icon={Radar} />
        </div>

        {/* System Overview + Pool */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-xl">System Overview</CardTitle><CardDescription>Live addresses and on-chain artifacts for the Argos demo stack.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <ContractRow label="Argos Hook" address={contracts.argos} />
              <ContractRow label="ArgosRiskAdapter" address={contracts.adapter} />
              <ContractRow label="Mock LST (mLST)" address={contracts.mLST} />
              <ContractRow label="Mock WETH (mWETH)" address={contracts.mWETH} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-xl">Monitored Pool</CardTitle><CardDescription>Protected Unichain Sepolia market using the live Argos hook.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Pool ID</div>
                <div className="mt-1 break-all text-sm font-medium text-slate-900">{pool.id}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[["Pair","mLST / mWETH"],["Price",pool.price],["Fee",pool.fee],["Tick Spacing",pool.tickSpacing]].map(([k,v])=>(
                  <div key={k} className="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div className="text-slate-500">{k}</div><div className="mt-1 font-medium text-slate-900">{v}</div></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Simulation + Timeline */}
        <div className="mt-6 grid gap-6 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader><CardTitle className="text-xl">Reactive Flow Simulation</CardTitle><CardDescription>Simulate a large LST transfer crossing the threshold and visualize how protection would be applied.</CardDescription></CardHeader>
            <CardContent>
              <Tabs defaultValue="flow" className="w-full">
                <TabsList className="mb-4 grid w-full grid-cols-2"><TabsTrigger value="flow">Flow</TabsTrigger><TabsTrigger value="controls">Controls</TabsTrigger></TabsList>
                <TabsContent value="flow">
                  <div className="grid gap-4 md:grid-cols-5">
                    {[
                      {icon:Activity, title:"Origin Event", desc:"Large LST transfer detected on origin chain."},
                      {icon:Radar, title:"ReactiveSentry", desc:"Threshold logic prepares callback payload."},
                      {icon:ArrowRightLeft, title:"Callback", desc:"Payload targets Unichain Sepolia adapter."},
                      {icon:CheckCircle2, title:"Adapter", desc:"Approved pool + callback auth enforced."},
                      {icon:Shield, title:"Argos", desc:"RiskState updated for the protected pool."},
                    ].map((step, i) => (
                      <div key={step.title} className="relative">
                        <div className="h-full rounded-2xl border border-slate-200 bg-white p-4">
                          <step.icon className="mb-3 h-5 w-5 text-slate-700" />
                          <div className="text-sm font-medium text-slate-900">{step.title}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-500">{step.desc}</div>
                        </div>
                        {i < 4 && <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 xl:block z-10"><Waves className="h-5 w-5 text-slate-300" /></div>}
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="controls" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Whale Dump Threshold</label><Input value={threshold} onChange={e=>setThreshold(e.target.value)} /></div>
                    <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Simulated Transfer Amount</label><Input value={simulatedTransfer} onChange={e=>setSimulatedTransfer(e.target.value)} /></div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span className="font-medium">Threshold saturation</span>
                      <span className="font-bold text-slate-900">{thresholdPercent}%</span>
                    </div>
                    <Progress value={thresholdPercent} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button className="rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={() => setDemoRiskState(callbackStatus==="Triggered"?"Blocked":"Safe")}><RefreshCw className="mr-2 h-4 w-4" />Simulate Callback Result</Button>
                    <Button variant="outline" className="rounded-2xl" onClick={()=>setDemoRiskState("Safe")}>Reset Demo State</Button>
                    <Badge className={`rounded-full px-3 py-1 border-0 ${riskBadge(demoRiskState)}`}>Demo State: {demoRiskState}</Badge>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600">This panel is a frontend simulation layer. The verified on-chain state is shown separately below.</div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader><CardTitle className="text-xl">Deployment Timeline</CardTitle><CardDescription>Recent on-chain actions for the Argos demo stack.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {txs.map(tx=>(
                <div key={tx.hash} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="text-sm font-medium text-slate-900">{tx.label}</div><div className="mt-1 text-xs text-slate-500">Block {tx.block}</div></div>
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span className="font-mono">{short(tx.hash)}</span>
                    <a href={explorer(`tx/${tx.hash}`)} target="_blank" rel="noreferrer" className="inline-flex items-center text-sky-600 hover:text-sky-700 font-medium">Open Explorer<ExternalLink className="ml-1 h-3.5 w-3.5" /></a>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Verified State + Reactive Destination */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-xl">Verified Wiring State</CardTitle><CardDescription>Captured from the completed Unichain Sepolia demo run.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                {label:"Argos riskController", value:verifiedState.riskController, mono:true},
                {label:"Approved demo pool", value:String(verifiedState.approvedPool), mono:false},
              ].map(r=>(
                <div key={r.label} className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <div><div className="font-medium text-slate-900">{r.label}</div><div className={`mt-1 text-xs text-slate-500 ${r.mono?"font-mono break-all":""}`}>{r.value}</div></div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">Market configured</div>
                  <div className="mt-1 text-xs text-slate-500">enabled: <span className="font-mono text-slate-700">{String(verifiedState.enabled)}</span>, riskState: <span className="font-mono text-slate-700">{verifiedState.riskState}</span></div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-xl">Reactive Destination</CardTitle><CardDescription>Canonical destination values pinned for Unichain Sepolia integration.</CardDescription></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div className="text-slate-500">Destination Chain ID</div><div className="mt-1 font-medium text-slate-900">{pool.chainId}</div></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div className="text-slate-500">Callback Proxy</div><div className="mt-1 break-all font-mono font-medium text-slate-900">{pool.callbackProxy}</div></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4"><div className="text-slate-500">Hook Permissions</div><div className="mt-1 font-mono text-xs text-slate-900">BEFORE_SWAP_FLAG | BEFORE_SWAP_RETURNS_DELTA_FLAG <span className="text-slate-500">(136)</span></div></div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
