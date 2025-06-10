import LeftPanel from "@/components/LeftPanel";
import Topbar from "@/components/Topbar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
    const isMobile = false;
    return (
        <>
        <Topbar />
        <div className="min-h-screen bg-black text-white flex flex-col">
            <ResizablePanelGroup direction="horizontal" className="flex flex-1 p-2">
                <ResizablePanel defaultSize={20} minSize={isMobile ? 0 : 30}>
                    <LeftPanel />
                </ResizablePanel>
                <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
                <ResizablePanel defaultSize={80}>
                    <Outlet />
                </ResizablePanel>
                <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
            </ResizablePanelGroup>
        </div>
        </>
    )
}

export default MainLayout;