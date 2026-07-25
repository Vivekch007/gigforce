# HR

# DashBoard

\<div class\="min-h-screen bg-gray-50 font-sans"\>  
   
  \<\!-- Top Navigation Bar \--\>  
  \<nav class\="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class\="flex items-center space-x-3"\>  
      \<span class\="font-bold text-2xl text-blue-400 tracking-tight"\>GigForce\</span\>  
      \<span class\="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2 py-0.5 rounded"\>HR / HIRING MANAGER PORTAL\</span\>  
    \</div\>  
     
    \<div class\="flex items-center space-x-6"\>  
      \<div class\="relative w-64 hidden sm:block"\>  
        \<input type\="text" placeholder\="Search requisition, contractor..." class\="w-full bg-slate-800 text-slate-200 rounded-md py-1.5 px-4 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /\>  
      \</div\>

      \<\!-- Notifications Bell \--\>  
      \<div class\="relative cursor-pointer p-1 text-slate-300 hover:text-white"\>  
        \<span class\="absolute \-top-1 \-right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-\[10px\] text-white font-bold ring-2 ring-slate-900"\>  
          5  
        \</span\>  
        \<svg class\="h-6 w-6" fill\="none" viewBox\="0 0 24 24" stroke\="currentColor"\>\<path stroke-linecap\="round" stroke-linejoin\="round" stroke-width\="2" d\="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"\>\</path\>\</svg\>  
      \</div\>  
       
      \<\!-- User Profile \--\>  
      \<div class\="flex items-center space-x-3 border-l border-slate-800 pl-6 cursor-pointer"\>  
        \<div class\="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>HR\</div\>  
        \<span class\="text-sm font-medium text-slate-200"\>Sarah Jenkins \<span class\="text-slate-400 text-xs ml-1"\>▼\</span\>\</span\>  
      \</div\>  
    \</div\>  
  \</nav\>

  \<div class\="flex"\>  
    \<\!-- Left Navigation Sidebar \--\>  
    \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Management Console\</div\>  
      \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md cursor-pointer flex items-center font-bold"\>  
          \<span class\="mr-3 text-lg"\>📊\</span\> Dashboard  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>💼\</span\> Resource Requisitions  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>📥\</span\> Vendor Submissions  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>📋\</span\> Assignments & Contracts  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>⏱️\</span\> Timesheet Approvals  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>🏖️\</span\> Leave Approvals  
        \</li\>  
      \</ul\>  
    \</aside\>

    \<\!-- Main Workspace \--\>  
    \<main class\="flex-1 p-8"\>  
       
      \<\!-- Welcome Header \--\>  
      \<div class\="flex flex-wrap justify-between items-center gap-4 mb-8"\>  
        \<div\>  
          \<h1 class\="text-2xl font-bold text-gray-900"\>Workforce Overview\</h1\>  
          \<p class\="text-gray-500 mt-1 text-sm"\>Monitor sourcing pipelines, approve contractor timesheets, and manage requisitions.\</p\>  
        \</div\>

        \<div class\="flex items-center space-x-3"\>  
          \<button class\="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"\>  
            Review Candidate Submissions  
          \</button\>  
          \<button class\="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow transition flex items-center"\>  
            \<span class\="mr-2 text-lg"\>\+\</span\> Raise Requisition (POST)  
          \</button\>  
        \</div\>  
      \</div\>

      \<\!-- Quick Metrics Header (GET /api/v1/reports/hr-dashboard) \--\>  
      \<div class\="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"\>  
        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200"\>  
          \<div class\="flex justify-between items-start"\>  
            \<div\>  
              \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Open Requisitions\</p\>  
              \<h3 class\="text-2xl font-black text-green-600 mt-1"\>8\</h3\>  
            \</div\>  
            \<span class\="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded"\>OPEN\</span\>  
          \</div\>  
          \<p class\="text-xs text-gray-500 mt-2"\>Receiving vendor submissions\</p\>  
        \</div\>

        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200"\>  
          \<div class\="flex justify-between items-start"\>  
            \<div\>  
              \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Pending Timesheets\</p\>  
              \<h3 class\="text-2xl font-black text-amber-600 mt-1"\>4\</h3\>  
            \</div\>  
            \<span class\="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded"\>ACTION REQ\</span\>  
          \</div\>  
          \<p class\="text-xs text-amber-600 font-medium mt-2"\>Awaiting your approval\</p\>  
        \</div\>

        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200"\>  
          \<div class\="flex justify-between items-start"\>  
            \<div\>  
              \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Active Assignments\</p\>  
              \<h3 class\="text-2xl font-black text-gray-900 mt-1"\>16\</h3\>  
            \</div\>  
            \<span class\="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded"\>DEPLOYED\</span\>  
          \</div\>  
          \<p class\="text-xs text-gray-500 mt-2"\>Active contractors on SOW\</p\>  
        \</div\>

        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200"\>  
          \<div class\="flex justify-between items-start"\>  
            \<div\>  
              \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Pending Leave Requests\</p\>  
              \<h3 class\="text-2xl font-black text-purple-600 mt-1"\>2\</h3\>  
            \</div\>  
            \<span class\="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded"\>ABSENCES\</span\>  
          \</div\>  
          \<p class\="text-xs text-gray-500 mt-2"\>Awaiting leave sign-off\</p\>  
        \</div\>  
      \</div\>

      \<\!-- Main Layout: Requisitions Pipeline (Left 2 Cols) & Approval Action Items (Right 1 Col) \--\>  
      \<div class\="grid grid-cols-1 lg:grid-cols-3 gap-8"\>  
         
        \<\!-- Open Requisitions Table (GET /api/v1/requisitions?status=OPEN) \--\>  
        \<div class\="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
          \<div class\="flex justify-between items-center mb-6 pb-4 border-b"\>  
            \<div\>  
              \<h2 class\="text-lg font-bold text-gray-800"\>Active Requisitions\</h2\>  
              \<p class\="text-xs text-gray-500"\>Track demand fulfillment and vendor submissions\</p\>  
            \</div\>  
            \<a href\="\#" class\="text-xs font-bold text-indigo-600 hover:underline"\>View All (18) →\</a\>  
          \</div\>

          \<div class\="overflow-x-auto"\>  
            \<table class\="w-full text-left border-collapse"\>  
              \<thead\>  
                \<tr class\="border-b text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50"\>  
                  \<th class\="p-3"\>Title / Req ID\</th\>  
                  \<th class\="p-3"\>Skill Criteria\</th\>  
                  \<th class\="p-3"\>Submissions\</th\>  
                  \<th class\="p-3"\>Status\</th\>  
                  \<th class\="p-3 text-right"\>Action\</th\>  
                \</tr\>  
              \</thead\>  
              \<tbody class\="divide-y text-sm"\>  
                 
                \<tr class\="hover:bg-gray-50 transition"\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-900"\>Sr. Spring Boot Engineer\</p\>  
                    \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-001\</p\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-semibold text-gray-800"\>Java Spring Boot\</p\>  
                    \<span class\="text-\[10px\] text-gray-500"\>Max $95/hr • SENIOR\</span\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full text-xs"\>  
                      5 Submissions  
                    \</span\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>OPEN\</span\>  
                  \</td\>  
                  \<td class\="p-3 text-right"\>  
                    \<button class\="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"\>  
                      Review →  
                    \</button\>  
                  \</td\>  
                \</tr\>

                \<tr class\="hover:bg-gray-50 transition"\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-900"\>React Frontend Specialist\</p\>  
                    \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-004\</p\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-semibold text-gray-800"\>React.js\</p\>  
                    \<span class\="text-\[10px\] text-gray-500"\>Max $80/hr • MID\</span\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full text-xs"\>  
                      3 Submissions  
                    \</span\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>OPEN\</span\>  
                  \</td\>  
                  \<td class\="p-3 text-right"\>  
                    \<button class\="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"\>  
                      Review →  
                    \</button\>  
                  \</td\>  
                \</tr\>

                \<tr class\="hover:bg-gray-50 transition"\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-900"\>Cloud DevOps Architect\</p\>  
                    \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-008\</p\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-semibold text-gray-800"\>AWS Cloud\</p\>  
                    \<span class\="text-\[10px\] text-gray-500"\>Max $120/hr • SENIOR\</span\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs"\>  
                      1 Submission  
                    \</span\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full"\>UNDER REVIEW\</span\>  
                  \</td\>  
                  \<td class\="p-3 text-right"\>  
                    \<button class\="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"\>  
                      Review →  
                    \</button\>  
                  \</td\>  
                \</tr\>

              \</tbody\>  
            \</table\>  
          \</div\>  
        \</div\>

        \<\!-- Right Side Panel: Urgent Approval Queues \--\>  
        \<div class\="space-y-6"\>  
           
          \<\!-- Pending Timesheets Queue (GET /api/v1/timesheets?status=SUBMITTED) \--\>  
          \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
            \<div class\="flex justify-between items-center pb-3 mb-4 border-b"\>  
              \<h2 class\="text-base font-bold text-gray-800"\>Timesheets Awaiting Sign-off\</h2\>  
              \<span class\="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full"\>4 Pending\</span\>  
            \</div\>

            \<div class\="space-y-3"\>  
              \<div class\="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100/80 transition text-xs flex justify-between items-center"\>  
                \<div\>  
                  \<p class\="font-bold text-gray-900"\>John Doe\</p\>  
                  \<p class\="text-gray-500"\>Week: Jul 13 – Jul 17 (41.5 hrs)\</p\>  
                \</div\>  
                \<button class\="bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded shadow text-xs"\>  
                  Approve  
                \</button\>  
              \</div\>

              \<div class\="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100/80 transition text-xs flex justify-between items-center"\>  
                \<div\>  
                  \<p class\="font-bold text-gray-900"\>Michael Chang\</p\>  
                  \<p class\="text-gray-500"\>Week: Jul 13 – Jul 17 (40.0 hrs)\</p\>  
                \</div\>  
                \<button class\="bg-green-600 hover:bg-green-700 text-white font-bold px-2.5 py-1 rounded shadow text-xs"\>  
                  Approve  
                \</button\>  
              \</div\>  
            \</div\>

            \<a href\="\#" class\="block text-center text-xs font-bold text-indigo-600 hover:underline mt-4 pt-2 border-t"\>  
              Open Full Approval Queue →  
            \</a\>  
          \</div\>

          \<\!-- Pending Absence Requests Queue (GET /api/v1/absences?status=PENDING) \--\>  
          \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
            \<div class\="flex justify-between items-center pb-3 mb-4 border-b"\>  
              \<h2 class\="text-base font-bold text-gray-800"\>Leave Requests\</h2\>  
              \<span class\="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-full"\>2 Pending\</span\>  
            \</div\>

            \<div class\="p-3 border rounded-lg bg-gray-50 text-xs mb-3"\>  
              \<div class\="flex justify-between font-bold text-gray-800 mb-1"\>  
                \<span\>Elena Rostova\</span\>  
                \<span class\="text-purple-700 font-semibold"\>Casual Leave\</span\>  
              \</div\>  
              \<p class\="text-gray-500"\>Date: Aug 02, 2026 (Full Day)\</p\>  
              \<div class\="flex space-x-2 mt-2 pt-2 border-t justify-end"\>  
                \<button class\="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded border border-red-200"\>Reject\</button\>  
                \<button class\="bg-indigo-600 text-white font-bold px-2.5 py-0.5 rounded"\>Approve\</button\>  
              \</div\>  
            \</div\>  
          \</div\>

        \</div\>

      \</div\>

    \</main\>  
  \</div\>  
\</div\>

# Resource Requisitions

\<div class\="min-h-screen bg-gray-50 font-sans flex"\>  
  \<\!-- Navigation Sidebar \--\>  
  \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
    \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Management Console\</div\>  
    \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
      \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold flex items-center"\>💼 Resource Requisitions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📥 Vendor Submissions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📋 Assignments & Contracts\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>⏱️ Timesheet Approvals\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>🏖️ Leave Approvals\</li\>  
    \</ul\>  
  \</aside\>

  \<\!-- Main Content \--\>  
  \<main class\="flex-1 p-8"\>  
    \<div class\="flex justify-between items-center mb-8"\>  
      \<div\>  
        \<h1 class\="text-2xl font-bold text-gray-900"\>Resource Requisitions\</h1\>  
        \<p class\="text-gray-500 text-sm"\>Raise contract demands and manage open job positions.\</p\>  
      \</div\>  
      \<button class\="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg shadow"\>\+ Create Requisition\</button\>  
    \</div\>

    \<\!-- Requisitions Table \--\>  
    \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
      \<table class\="w-full text-left border-collapse"\>  
        \<thead\>  
          \<tr class\="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
            \<th class\="p-3"\>Req ID / Title\</th\>  
            \<th class\="p-3"\>Skill / Level\</th\>  
            \<th class\="p-3"\>Qty & Max Rate\</th\>  
            \<th class\="p-3"\>Status\</th\>  
            \<th class\="p-3 text-right"\>Actions\</th\>  
          \</tr\>  
        \</thead\>  
        \<tbody class\="divide-y text-sm"\>  
          \<tr class\="hover:bg-gray-50"\>  
            \<td class\="p-3"\>  
              \<p class\="font-bold text-gray-900"\>Sr. Spring Boot Engineer\</p\>  
              \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-001\</p\>  
            \</td\>  
            \<td class\="p-3 font-semibold text-gray-800"\>Java Spring Boot \<span class\="block text-\[10px\] text-indigo-600"\>SENIOR (5+ Yrs)\</span\>\</td\>  
            \<td class\="p-3 font-semibold text-gray-800"\>2 Positions \<span class\="block text-xs text-gray-400 font-normal"\>$95.00/hr\</span\>\</td\>  
            \<td class\="p-3"\>\<span class\="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>OPEN\</span\>\</td\>  
            \<td class\="p-3 text-right space-x-2"\>  
              \<button class\="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded"\>Review\</button\>  
              \<button class\="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded"\>Cancel\</button\>  
            \</td\>  
          \</tr\>  
        \</tbody\>  
      \</table\>  
    \</div\>  
  \</main\>  
\</div\>

# Vendor Submission

\<div class\="min-h-screen bg-gray-50 font-sans flex"\>  
  \<\!-- Navigation Sidebar \--\>  
  \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
    \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Management Console\</div\>  
    \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>💼 Resource Requisitions\</li\>  
      \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold flex items-center"\>📥 Vendor Submissions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📋 Assignments & Contracts\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>⏱️ Timesheet Approvals\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>🏖️ Leave Approvals\</li\>  
    \</ul\>  
  \</aside\>

  \<\!-- Main Content \--\>  
  \<main class\="flex-1 p-8"\>  
    \<div class\="flex justify-between items-center mb-8"\>  
      \<div\>  
        \<h1 class\="text-2xl font-bold text-gray-900"\>Vendor Submissions\</h1\>  
        \<p class\="text-gray-500 text-sm"\>Review candidate profiles submitted by staffing vendors.\</p\>  
      \</div\>  
    \</div\>

    \<\!-- Submissions Table \--\>  
    \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
      \<table class\="w-full text-left border-collapse"\>  
        \<thead\>  
          \<tr class\="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
            \<th class\="p-3"\>Candidate / Vendor\</th\>  
            \<th class\="p-3"\>Requisition Ref\</th\>  
            \<th class\="p-3"\>Proposed Rate\</th\>  
            \<th class\="p-3"\>Stage\</th\>  
            \<th class\="p-3 text-right"\>Actions\</th\>  
          \</tr\>  
        \</thead\>  
        \<tbody class\="divide-y text-sm"\>  
          \<tr class\="hover:bg-gray-50"\>  
            \<td class\="p-3"\>  
              \<p class\="font-bold text-gray-900"\>John Doe\</p\>  
              \<p class\="text-xs text-gray-400"\>Apex Talent Agency\</p\>  
            \</td\>  
            \<td class\="p-3 font-semibold text-gray-800"\>REQ-2026-001 \<span class\="block text-xs text-gray-400"\>Sr. Java Developer\</span\>\</td\>  
            \<td class\="p-3 font-bold text-gray-900"\>$680.00 / day\</td\>  
            \<td class\="p-3"\>\<span class\="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full"\>SHORTLISTED\</span\>\</td\>  
            \<td class\="p-3 text-right space-x-2"\>  
              \<button class\="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded shadow"\>Select\</button\>  
              \<button class\="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded"\>Reject\</button\>  
            \</td\>  
          \</tr\>  
        \</tbody\>  
      \</table\>  
    \</div\>  
  \</main\>  
\</div\>

# Assignments and Contractors

\<div class\="min-h-screen bg-gray-50 font-sans flex"\>  
  \<\!-- Navigation Sidebar \--\>  
  \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
    \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Management Console\</div\>  
    \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>💼 Resource Requisitions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📥 Vendor Submissions\</li\>  
      \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold flex items-center"\>📋 Assignments & Contracts\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>⏱️ Timesheet Approvals\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>🏖️ Leave Approvals\</li\>  
    \</ul\>  
  \</aside\>

  \<\!-- Main Content \--\>  
  \<main class\="flex-1 p-8"\>  
    \<div class\="flex justify-between items-center mb-8"\>  
      \<div\>  
        \<h1 class\="text-2xl font-bold text-gray-900"\>Assignments & Contracts\</h1\>  
        \<p class\="text-gray-500 text-sm"\>Active contractor work orders and Statement of Work (SOW) terms.\</p\>  
      \</div\>  
    \</div\>

    \<\!-- Assignments Table \--\>  
    \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
      \<table class\="w-full text-left border-collapse"\>  
        \<thead\>  
          \<tr class\="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
            \<th class\="p-3"\>Assignment ID / Contractor\</th\>  
            \<th class\="p-3"\>SOW Reference\</th\>  
            \<th class\="p-3"\>Daily Rate\</th\>  
            \<th class\="p-3"\>Engagement\</th\>  
            \<th class\="p-3 text-right"\>Status\</th\>  
          \</tr\>  
        \</thead\>  
        \<tbody class\="divide-y text-sm"\>  
          \<tr class\="hover:bg-gray-50"\>  
            \<td class\="p-3"\>  
              \<p class\="font-bold text-gray-900"\>ASN-2026-8819\</p\>  
              \<p class\="text-xs text-gray-500"\>John Doe (Sr. Java Engineer)\</p\>  
            \</td\>  
            \<td class\="p-3 font-mono text-xs text-indigo-600"\>SOW-2026-8819\</td\>  
            \<td class\="p-3 font-bold text-gray-900"\>$680.00 / day\</td\>  
            \<td class\="p-3 font-semibold text-gray-700"\>REMOTE\</td\>  
            \<td class\="p-3 text-right"\>\<span class\="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>ACTIVE\</span\>\</td\>  
          \</tr\>  
        \</tbody\>  
      \</table\>  
    \</div\>  
  \</main\>  
\</div\>

# Time Sheet Approvals

\<div class\="min-h-screen bg-gray-50 font-sans flex"\>  
  \<\!-- Navigation Sidebar \--\>  
  \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
    \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Management Console\</div\>  
    \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>💼 Resource Requisitions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📥 Vendor Submissions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📋 Assignments & Contracts\</li\>  
      \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold flex items-center"\>⏱️ Timesheet Approvals\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>🏖️ Leave Approvals\</li\>  
    \</ul\>  
  \</aside\>

  \<\!-- Main Content \--\>  
  \<main class\="flex-1 p-8"\>  
    \<div class\="flex justify-between items-center mb-8"\>  
      \<div\>  
        \<h1 class\="text-2xl font-bold text-gray-900"\>Timesheet Approvals\</h1\>  
        \<p class\="text-gray-500 text-sm"\>Review weekly hours logged by contractors before passing to payroll.\</p\>  
      \</div\>  
    \</div\>

    \<\!-- Timesheet Review Table \--\>  
    \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
      \<table class\="w-full text-left border-collapse"\>  
        \<thead\>  
          \<tr class\="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
            \<th class\="p-3"\>Contractor\</th\>  
            \<th class\="p-3"\>Week Period\</th\>  
            \<th class\="p-3"\>Hours Logged\</th\>  
            \<th class\="p-3"\>Billable Amount\</th\>  
            \<th class\="p-3 text-right"\>Actions\</th\>  
          \</tr\>  
        \</thead\>  
        \<tbody class\="divide-y text-sm"\>  
          \<tr class\="hover:bg-gray-50"\>  
            \<td class\="p-3"\>  
              \<p class\="font-bold text-gray-900"\>John Doe\</p\>  
              \<p class\="text-xs text-gray-400"\>Sr. Spring Boot Engineer\</p\>  
            \</td\>  
            \<td class\="p-3 text-xs text-gray-700 font-semibold"\>Jul 13 – Jul 17, 2026\</td\>  
            \<td class\="p-3 font-bold text-gray-900"\>41.5 hrs \<span class\="text-\[10px\] text-amber-600 block"\>\+1.5 OT\</span\>\</td\>  
            \<td class\="p-3 font-bold text-green-700"\>$3,527.50\</td\>  
            \<td class\="p-3 text-right space-x-2"\>  
              \<button class\="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded shadow"\>Approve\</button\>  
              \<button class\="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded"\>Reject\</button\>  
            \</td\>  
          \</tr\>  
        \</tbody\>  
      \</table\>  
    \</div\>  
  \</main\>  
\</div\>

# Leave Approvals

\<div class\="min-h-screen bg-gray-50 font-sans flex"\>  
  \<\!-- Navigation Sidebar \--\>  
  \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
    \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Management Console\</div\>  
    \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>💼 Resource Requisitions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📥 Vendor Submissions\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>📋 Assignments & Contracts\</li\>  
      \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center"\>⏱️ Timesheet Approvals\</li\>  
      \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold flex items-center"\>🏖️ Leave Approvals\</li\>  
    \</ul\>  
  \</aside\>

  \<\!-- Main Content \--\>  
  \<main class\="flex-1 p-8"\>  
    \<div class\="flex justify-between items-center mb-8"\>  
      \<div\>  
        \<h1 class\="text-2xl font-bold text-gray-900"\>Leave Approvals\</h1\>  
        \<p class\="text-gray-500 text-sm"\>Review contractor leave and absence requests.\</p\>  
      \</div\>  
    \</div\>

    \<\!-- Leave Requests Table \--\>  
    \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
      \<table class\="w-full text-left border-collapse"\>  
        \<thead\>  
          \<tr class\="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
            \<th class\="p-3"\>Contractor\</th\>  
            \<th class\="p-3"\>Leave Type\</th\>  
            \<th class\="p-3"\>Requested Date\</th\>  
            \<th class\="p-3"\>Reason\</th\>  
            \<th class\="p-3 text-right"\>Actions\</th\>  
          \</tr\>  
        \</thead\>  
        \<tbody class\="divide-y text-sm"\>  
          \<tr class\="hover:bg-gray-50"\>  
            \<td class\="p-3"\>  
              \<p class\="font-bold text-gray-900"\>Elena Rostova\</p\>  
              \<p class\="text-xs text-gray-400"\>Cloud DevOps Architect\</p\>  
            \</td\>  
            \<td class\="p-3 font-semibold text-indigo-700"\>Casual Leave\</td\>  
            \<td class\="p-3 text-xs text-gray-700 font-semibold"\>Aug 02, 2026 (Full Day)\</td\>  
            \<td class\="p-3 text-xs text-gray-500"\>Personal medical appointment\</td\>  
            \<td class\="p-3 text-right space-x-2"\>  
              \<button class\="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded shadow"\>Approve\</button\>  
              \<button class\="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded"\>Reject\</button\>  
            \</td\>  
          \</tr\>  
        \</tbody\>  
      \</table\>  
    \</div\>  
  \</main\>  
\</div\>

# Vendor

# Dashboard

\<div class\="min-h-screen bg-gray-50 font-sans"\>  
   
  \<\!-- Top Navigation Bar \--\>  
  \<nav class\="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class\="flex items-center space-x-3"\>  
      \<span class\="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class\="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>VENDOR AGENCY PORTAL\</span\>  
    \</div\>  
     
    \<div class\="flex items-center space-x-6"\>  
      \<div class\="relative w-64 hidden sm:block"\>  
        \<input type\="text" placeholder\="Search candidate, requisition, PO..." class\="w-full bg-slate-800 text-slate-200 rounded-md py-1.5 px-4 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /\>  
      \</div\>

      \<\!-- Notifications Bell \--\>  
      \<div class\="relative cursor-pointer p-1 text-slate-300 hover:text-white"\>  
        \<span class\="absolute \-top-1 \-right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-\[10px\] text-white font-bold ring-2 ring-slate-900"\>  
          3  
        \</span\>  
        \<svg class\="h-6 w-6" fill\="none" viewBox\="0 0 24 24" stroke\="currentColor"\>\<path stroke-linecap\="round" stroke-linejoin\="round" stroke-width\="2" d\="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"\>\</path\>\</svg\>  
      \</div\>  
       
      \<\!-- User / Agency Profile \--\>  
      \<div class\="flex items-center space-x-3 border-l border-slate-800 pl-6 cursor-pointer"\>  
        \<div class\="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>TA\</div\>  
        \<span class\="text-sm font-medium text-slate-200"\>Apex Talent Agency \<span class\="text-slate-400 text-xs ml-1"\>▼\</span\>\</span\>  
      \</div\>  
    \</div\>  
  \</nav\>

  \<div class\="flex"\>  
    \<\!-- Left Navigation Sidebar \--\>  
    \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Agency Workspace\</div\>  
      \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold flex items-center"\>  
          \<span class\="mr-3 text-lg"\>📊\</span\> Dashboard  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>💼\</span\> Open Requisitions  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>📤\</span\> Candidate Submissions  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>📋\</span\> Deployed Contractors  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>💳\</span\> Purchase Orders  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>🧾\</span\> Invoices & Billing  
        \</li\>  
      \</ul\>  
    \</aside\>

    \<\!-- Main Workspace \--\>  
    \<main class\="flex-1 p-8"\>  
       
      \<\!-- Welcome Header \--\>  
      \<div class\="flex flex-wrap justify-between items-center gap-4 mb-8"\>  
        \<div\>  
          \<h1 class\="text-2xl font-bold text-gray-900"\>Agency Overview\</h1\>  
          \<p class\="text-gray-500 mt-1 text-sm"\>Source talent against open requisitions, submit candidates, and monitor placement metrics.\</p\>  
        \</div\>

        \<div class\="flex items-center space-x-3"\>  
          \<button class\="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"\>  
            Browse All Requisitions  
          \</button\>  
          \<button class\="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow transition flex items-center"\>  
            \<span class\="mr-2 text-lg"\>\+\</span\> Submit Candidate Profile  
          \</button\>  
        \</div\>  
      \</div\>

      \<\!-- Quick Metrics Header \--\>  
      \<div class\="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"\>  
        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200"\>  
          \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Active Client Requisitions\</p\>  
          \<h3 class\="text-2xl font-black text-gray-900 mt-1"\>12\</h3\>  
          \<p class\="text-xs text-indigo-600 font-medium mt-1"\>Accepting submissions\</p\>  
        \</div\>

        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200"\>  
          \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Total Submissions\</p\>  
          \<h3 class\="text-2xl font-black text-indigo-600 mt-1"\>24\</h3\>  
          \<p class\="text-xs text-indigo-600 font-medium mt-1"\>Active in pipeline\</p\>  
        \</div\>

        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500"\>  
          \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Selected Candidates\</p\>  
          \<h3 class\="text-2xl font-black text-green-600 mt-1"\>5\</h3\>  
          \<p class\="text-xs text-green-700 font-bold mt-1"\>Ready for contract assignment\</p\>  
        \</div\>

        \<div class\="bg-white p-5 rounded-xl shadow-sm border border-gray-200"\>  
          \<p class\="text-xs font-bold text-gray-400 uppercase tracking-wider"\>Billed Amount (YTD)\</p\>  
          \<h3 class\="text-2xl font-black text-gray-900 mt-1"\>$142,500.00\</h3\>  
          \<p class\="text-xs text-gray-500 mt-1"\>Across 8 active POs\</p\>  
        \</div\>  
      \</div\>

      \<\!-- Layout Grid: Candidate Pipeline (Left 2 Cols) & Open Requisitions (Right 1 Col) \--\>  
      \<div class\="grid grid-cols-1 lg:grid-cols-3 gap-8"\>  
         
        \<\!-- Candidate Submissions Tracking Table \--\>  
        \<div class\="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
          \<div class\="flex justify-between items-center mb-6 pb-4 border-b"\>  
            \<div\>  
              \<h2 class\="text-lg font-bold text-gray-800"\>Submitted Candidate Pipeline\</h2\>  
              \<p class\="text-xs text-gray-500"\>Track client manager selection decisions and stage status\</p\>  
            \</div\>  
            \<a href\="\#" class\="text-xs font-bold text-indigo-600 hover:underline"\>View All Submissions →\</a\>  
          \</div\>

          \<div class\="overflow-x-auto"\>  
            \<table class\="w-full text-left border-collapse"\>  
              \<thead\>  
                \<tr class\="border-b text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50"\>  
                  \<th class\="p-3"\>Candidate\</th\>  
                  \<th class\="p-3"\>Requisition Title\</th\>  
                  \<th class\="p-3"\>Proposed Rate\</th\>  
                  \<th class\="p-3"\>Pipeline Stage\</th\>  
                  \<th class\="p-3 text-right"\>Action / Remarks\</th\>  
                \</tr\>  
              \</thead\>  
              \<tbody class\="divide-y text-sm"\>  
                 
                \<\!-- SELECTED Row \--\>  
                \<tr class\="bg-green-50/60 hover:bg-green-50 transition border-l-4 border-l-green-600"\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-900"\>John Doe\</p\>  
                    \<p class\="text-xs text-gray-500"\>john.doe@example.com\</p\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-800"\>Sr. Java Engineer\</p\>  
                    \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-001\</p\>  
                  \</td\>  
                  \<td class\="p-3 font-bold text-gray-900"\>$680.00 \<span class\="text-xs text-gray-400 font-normal"\>/ day\</span\>\</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="bg-green-100 text-green-800 border border-green-300 text-xs font-black px-2.5 py-1 rounded-full flex items-center w-fit"\>  
                      \<span class\="mr-1"\>✓\</span\> SELECTED  
                    \</span\>  
                  \</td\>  
                  \<td class\="p-3 text-right text-xs text-green-800 font-semibold"\>  
                    Awaiting contract generation  
                  \</td\>  
                \</tr\>

                \<\!-- INTERVIEW\_SCHEDULED Row \--\>  
                \<tr class\="hover:bg-gray-50 transition"\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-900"\>Michael Chang\</p\>  
                    \<p class\="text-xs text-gray-500"\>m.chang@example.com\</p\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-800"\>React Specialist\</p\>  
                    \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-004\</p\>  
                  \</td\>  
                  \<td class\="p-3 font-bold text-gray-900"\>$580.00 \<span class\="text-xs text-gray-400 font-normal"\>/ day\</span\>\</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full"\>  
                      INTERVIEW SCHEDULED  
                    \</span\>  
                  \</td\>  
                  \<td class\="p-3 text-right text-xs text-gray-500"\>  
                    Scheduled: Jul 28, 2:00 PM  
                  \</td\>  
                \</tr\>

                \<\!-- SHORTLISTED Row \--\>  
                \<tr class\="hover:bg-gray-50 transition"\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-900"\>Elena Rostova\</p\>  
                    \<p class\="text-xs text-gray-500"\>e.rostova@example.com\</p\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-800"\>Cloud DevOps Architect\</p\>  
                    \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-008\</p\>  
                  \</td\>  
                  \<td class\="p-3 font-bold text-gray-900"\>$850.00 \<span class\="text-xs text-gray-400 font-normal"\>/ day\</span\>\</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full"\>  
                      SHORTLISTED  
                    \</span\>  
                  \</td\>  
                  \<td class\="p-3 text-right text-xs text-gray-500"\>  
                    Manager reviewing skills  
                  \</td\>  
                \</tr\>

                \<\!-- REJECTED Row \--\>  
                \<tr class\="hover:bg-gray-50 transition opacity-70"\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-800"\>David Miller\</p\>  
                    \<p class\="text-xs text-gray-500"\>d.miller@example.com\</p\>  
                  \</td\>  
                  \<td class\="p-3"\>  
                    \<p class\="font-bold text-gray-800"\>Sr. Java Engineer\</p\>  
                    \<p class\="text-xs font-mono text-gray-400"\>REQ-2026-001\</p\>  
                  \</td\>  
                  \<td class\="p-3 font-bold text-gray-900"\>$750.00 \<span class\="text-xs text-gray-400 font-normal"\>/ day\</span\>\</td\>  
                  \<td class\="p-3"\>  
                    \<span class\="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full"\>  
                      REJECTED  
                    \</span\>  
                  \</td\>  
                  \<td class\="p-3 text-right text-xs text-red-600 italic"\>  
                    "Proposed rate exceeds budget"  
                  \</td\>  
                \</tr\>

              \</tbody\>  
            \</table\>  
          \</div\>  
        \</div\>

        \<\!-- Right Side Panel: Hot Open Requisitions \--\>  
        \<div class\="space-y-6"\>  
           
          \<\!-- Open Client Jobs Widget \--\>  
          \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
            \<div class\="flex justify-between items-center pb-3 mb-4 border-b"\>  
              \<h2 class\="text-base font-bold text-gray-800"\>High-Priority Open Requisitions\</h2\>  
              \<span class\="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>OPEN\</span\>  
            \</div\>

            \<div class\="space-y-4"\>  
              \<div class\="p-3.5 border rounded-lg bg-gray-50 hover:bg-gray-100/80 transition text-xs"\>  
                \<div class\="flex justify-between font-bold text-gray-900 mb-1"\>  
                  \<span\>Sr. Spring Boot Engineer\</span\>  
                  \<span class\="text-indigo-700 font-extrabold"\>$95.00/hr max\</span\>  
                \</div\>  
                \<p class\="text-gray-500"\>Req \#: REQ-2026-001 • 2 Positions\</p\>  
                \<p class\="text-gray-400 text-\[11px\] mt-1"\>Skills: Java, Spring Boot, Microservices, PostgreSQL\</p\>  
                \<button class\="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded transition"\>  
                  \+ Submit Candidate Now  
                \</button\>  
              \</div\>

              \<div class\="p-3.5 border rounded-lg bg-gray-50 hover:bg-gray-100/80 transition text-xs"\>  
                \<div class\="flex justify-between font-bold text-gray-900 mb-1"\>  
                  \<span\>React Frontend Specialist\</span\>  
                  \<span class\="text-indigo-700 font-extrabold"\>$80.00/hr max\</span\>  
                \</div\>  
                \<p class\="text-gray-500"\>Req \#: REQ-2026-004 • 1 Position\</p\>  
                \<p class\="text-gray-400 text-\[11px\] mt-1"\>Skills: React.js, TypeScript, Tailwind CSS\</p\>  
                \<button class\="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded transition"\>  
                  \+ Submit Candidate Now  
                \</button\>  
              \</div\>  
            \</div\>

            \<a href\="\#" class\="block text-center text-xs font-bold text-indigo-600 hover:underline mt-4 pt-2 border-t"\>  
              Explore All 12 Open Requisitions →  
            \</a\>  
          \</div\>

          \<\!-- Active Purchase Orders Summary \--\>  
          \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
            \<div class\="flex justify-between items-center pb-3 mb-4 border-b"\>  
              \<h2 class\="text-base font-bold text-gray-800"\>Active PO Balances\</h2\>  
              \<span class\="text-xs text-gray-400"\>8 POs\</span\>  
            \</div\>

            \<div class\="space-y-3 text-xs"\>  
              \<div class\="p-3 bg-gray-50 rounded-lg border"\>  
                \<div class\="flex justify-between font-bold text-gray-800 mb-1"\>  
                  \<span\>PO-2026-8801\</span\>  
                  \<span class\="text-green-700"\>$17,500.00 Remaining\</span\>  
                \</div\>  
                \<p class\="text-gray-500"\>Assignment: John Doe (Sr. Java)\</p\>  
                \<div class\="w-full bg-gray-200 rounded-full h-1.5 mt-2"\>  
                  \<div class\="bg-indigo-600 h-1.5 rounded-full" style\="width: 65%;"\>\</div\>  
                \</div\>  
              \</div\>  
            \</div\>  
          \</div\>

        \</div\>

      \</div\>

    \</main\>  
  \</div\>  
\</div\>

# Open Requisition

\<div class\="min-h-screen bg-gray-50 font-sans"\>  
   
  \<\!-- Top Navigation Bar \--\>  
  \<nav class\="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class\="flex items-center space-x-3"\>  
      \<span class\="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class\="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>OPEN REQUISITIONS\</span\>  
    \</div\>  
     
    \<div class\="flex items-center space-x-6"\>  
      \<div class\="relative w-64 hidden sm:block"\>  
        \<input type\="text" placeholder\="Search requisition, skills, location..." class\="w-full bg-slate-800 text-slate-200 rounded-md py-1.5 px-4 text-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" /\>  
      \</div\>

      \<\!-- User Profile \--\>  
      \<div class\="flex items-center space-x-3 border-l border-slate-800 pl-6 cursor-pointer"\>  
        \<div class\="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>HR\</div\>  
        \<span class\="text-sm font-medium text-slate-200"\>Sarah Jenkins \<span class\="text-slate-400 text-xs ml-1"\>▼\</span\>\</span\>  
      \</div\>  
    \</div\>  
  \</nav\>

  \<div class\="flex"\>  
    \<\!-- Left Navigation Sidebar \--\>  
    \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<div class\="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Management Console\</div\>  
      \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>📊\</span\> Dashboard  
        \</li\>  
        \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold flex items-center"\>  
          \<span class\="mr-3 text-lg"\>💼\</span\> Resource Requisitions  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>📥\</span\> Vendor Submissions  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>📋\</span\> Assignments & Contracts  
        \</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer flex items-center transition"\>  
          \<span class\="mr-3 text-lg"\>⏱️\</span\> Timesheet Approvals  
        \</li\>  
      \</ul\>  
    \</aside\>

    \<\!-- Main Workspace \--\>  
    \<main class\="flex-1 p-8"\>  
       
      \<\!-- Page Header \--\>  
      \<div class\="flex flex-wrap justify-between items-center gap-4 mb-8"\>  
        \<div\>  
          \<h1 class\="text-2xl font-bold text-gray-900"\>Open Resource Requisitions\</h1\>  
          \<p class\="text-gray-500 mt-1 text-sm"\>Publish new contingent demands, track candidate submissions, and manage requisition lifecycles.\</p\>  
        \</div\>

        \<button class\="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow transition flex items-center"\>  
          \<span class\="mr-2 text-lg"\>\+\</span\> Raise Requisition (POST)  
        \</button\>  
      \</div\>

      \<\!-- Quick Status Filter Bar \--\>  
      \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 flex flex-wrap justify-between items-center gap-4"\>  
        \<div class\="flex items-center space-x-2"\>  
          \<button class\="bg-indigo-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm"\>  
            Active Open (12)  
          \</button\>  
          \<button class\="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition"\>  
            Under Review (4)  
          \</button\>  
          \<button class\="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition"\>  
            Fulfilled / Closed (18)  
          \</button\>  
        \</div\>

        \<div class\="flex items-center space-x-3"\>  
          \<select class\="border rounded-lg p-2 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"\>  
            \<option value\=""\>Sort by: Latest Created\</option\>  
            \<option value\="rate"\>Highest Max Rate\</option\>  
            \<option value\="submissions"\>Most Submissions\</option\>  
          \</select\>  
        \</div\>  
      \</div\>

      \<\!-- Requisitions Grid \--\>  
      \<div class\="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"\>  
         
        \<\!-- Requisition Card 1 \--\>  
        \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:border-indigo-300 transition"\>  
          \<div\>  
            \<div class\="flex justify-between items-start mb-3"\>  
              \<span class\="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded"\>REQ-2026-001\</span\>  
              \<span class\="bg-green-100 text-green-800 text-\[10px\] font-bold px-2 py-0.5 rounded-full uppercase"\>OPEN\</span\>  
            \</div\>

            \<h3 class\="text-base font-bold text-gray-900 mb-1"\>Sr. Spring Boot Engineer\</h3\>  
            \<p class\="text-xs text-gray-500 mb-4"\>Engineering & IT • Full-Time Contract\</p\>

            \<div class\="space-y-2 text-xs text-gray-600 border-t pt-3 mb-4"\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Positions:\</span\>  
                \<span class\="font-bold text-gray-800"\>2 Required\</span\>  
              \</div\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Max Rate Cap:\</span\>  
                \<span class\="font-extrabold text-indigo-700"\>$95.00 / hr\</span\>  
              \</div\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Experience Level:\</span\>  
                \<span class\="font-bold text-gray-800"\>Senior (5+ Yrs)\</span\>  
              \</div\>  
            \</div\>

            \<\!-- Skills Badges \--\>  
            \<div class\="flex flex-wrap gap-1.5 mb-6"\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>Java\</span\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>Spring Boot\</span\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>Microservices\</span\>  
            \</div\>  
          \</div\>

          \<div class\="border-t pt-4 flex justify-between items-center"\>  
            \<span class\="text-\[11px\] font-bold text-indigo-600"\>5 Vendor Submissions\</span\>  
            \<button class\="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"\>  
              Review Pipeline →  
            \</button\>  
          \</div\>  
        \</div\>

        \<\!-- Requisition Card 2 \--\>  
        \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:border-indigo-300 transition"\>  
          \<div\>  
            \<div class\="flex justify-between items-start mb-3"\>  
              \<span class\="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded"\>REQ-2026-004\</span\>  
              \<span class\="bg-green-100 text-green-800 text-\[10px\] font-bold px-2 py-0.5 rounded-full uppercase"\>OPEN\</span\>  
            \</div\>

            \<h3 class\="text-base font-bold text-gray-900 mb-1"\>React Frontend Specialist\</h3\>  
            \<p class\="text-xs text-gray-500 mb-4"\>Product Development • Remote\</p\>

            \<div class\="space-y-2 text-xs text-gray-600 border-t pt-3 mb-4"\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Positions:\</span\>  
                \<span class\="font-bold text-gray-800"\>1 Required\</span\>  
              \</div\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Max Rate Cap:\</span\>  
                \<span class\="font-extrabold text-indigo-700"\>$80.00 / hr\</span\>  
              \</div\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Experience Level:\</span\>  
                \<span class\="font-bold text-gray-800"\>Mid-Senior (3+ Yrs)\</span\>  
              \</div\>  
            \</div\>

            \<\!-- Skills Badges \--\>  
            \<div class\="flex flex-wrap gap-1.5 mb-6"\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>React.js\</span\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>TypeScript\</span\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>Tailwind CSS\</span\>  
            \</div\>  
          \</div\>

          \<div class\="border-t pt-4 flex justify-between items-center"\>  
            \<span class\="text-\[11px\] font-bold text-indigo-600"\>3 Vendor Submissions\</span\>  
            \<button class\="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"\>  
              Review Pipeline →  
            \</button\>  
          \</div\>  
        \</div\>

        \<\!-- Requisition Card 3 \--\>  
        \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:border-indigo-300 transition"\>  
          \<div\>  
            \<div class\="flex justify-between items-start mb-3"\>  
              \<span class\="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded"\>REQ-2026-008\</span\>  
              \<span class\="bg-amber-100 text-amber-800 text-\[10px\] font-bold px-2 py-0.5 rounded-full uppercase"\>UNDER REVIEW\</span\>  
            \</div\>

            \<h3 class\="text-base font-bold text-gray-900 mb-1"\>Cloud DevOps Architect\</h3\>  
            \<p class\="text-xs text-gray-500 mb-4"\>Infrastructure & Security • On-Site\</p\>

            \<div class\="space-y-2 text-xs text-gray-600 border-t pt-3 mb-4"\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Positions:\</span\>  
                \<span class\="font-bold text-gray-800"\>1 Required\</span\>  
              \</div\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Max Rate Cap:\</span\>  
                \<span class\="font-extrabold text-indigo-700"\>$120.00 / hr\</span\>  
              \</div\>  
              \<div class\="flex justify-between"\>  
                \<span class\="text-gray-400 font-medium"\>Experience Level:\</span\>  
                \<span class\="font-bold text-gray-800"\>Architect (8+ Yrs)\</span\>  
              \</div\>  
            \</div\>

            \<\!-- Skills Badges \--\>  
            \<div class\="flex flex-wrap gap-1.5 mb-6"\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>AWS\</span\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>Kubernetes\</span\>  
              \<span class\="bg-gray-100 text-gray-700 text-\[10px\] font-semibold px-2 py-0.5 rounded"\>Terraform\</span\>  
            \</div\>  
          \</div\>

          \<div class\="border-t pt-4 flex justify-between items-center"\>  
            \<span class\="text-\[11px\] font-bold text-amber-600"\>1 Vendor Submission\</span\>  
            \<button class\="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition"\>  
              Review Pipeline →  
            \</button\>  
          \</div\>  
        \</div\>

      \</div\>

    \</main\>  
  \</div\>  
\</div\>

# Candidate Submissions

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>VENDOR AGENCY PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>TA\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>Apex Talent Agency\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📊 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💼 Open Requisitions\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>📤 Candidate Submissions\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📋 Deployed Contractors\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💳 Purchase Orders\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🧾 Invoices & Billing\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<h1 class="text-2xl font-bold text-gray-900 mb-6"\>Pitched Candidates Tracking\</h1\>  
      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>Candidate\</th\>  
              \<th class="p-3"\>Requisition ID\</th\>  
              \<th class="p-3"\>Proposed Rate\</th\>  
              \<th class="p-3 text-right"\>Stage\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3 font-bold text-gray-900"\>Michael Chang\</td\>  
              \<td class="p-3 font-mono text-xs text-indigo-600"\>REQ-2026-004\</td\>  
              \<td class="p-3 font-bold text-gray-800"\>$580.00 / day\</td\>  
              \<td class="p-3 text-right"\>  
                \<span class="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full"\>INTERVIEW SCHEDULED\</span\>  
              \</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# Deployed Contractors

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>VENDOR AGENCY PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>TA\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>Apex Talent Agency\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📊 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💼 Open Requisitions\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📤 Candidate Submissions\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>📋 Deployed Contractors\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💳 Purchase Orders\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🧾 Invoices & Billing\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<h1 class="text-2xl font-bold text-gray-900 mb-6"\>Active On-Site Contractors\</h1\>  
      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>Contractor Name\</th\>  
              \<th class="p-3"\>Assignment Ref\</th\>  
              \<th class="p-3"\>Engagement End Date\</th\>  
              \<th class="p-3 text-right"\>Status\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3 font-bold text-gray-900"\>John Doe\</td\>  
              \<td class="p-3 font-mono text-xs text-indigo-600"\>ASN-8819\</td\>  
              \<td class="p-3 text-xs text-gray-600"\>Dec 31, 2026\</td\>  
              \<td class="p-3 text-right"\>\<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>DEPLOYED\</span\>\</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# Purchase Orders

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>VENDOR AGENCY PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>TA\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>Apex Talent Agency\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📊 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💼 Open Requisitions\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📤 Candidate Submissions\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📋 Deployed Contractors\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>💳 Purchase Orders\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🧾 Invoices & Billing\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<h1 class="text-2xl font-bold text-gray-900 mb-6"\>Assigned Purchase Order Caps\</h1\>  
      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>PO Reference\</th\>  
              \<th class="p-3"\>Target Assignment\</th\>  
              \<th class="p-3"\>Committed Budget Cap\</th\>  
              \<th class="p-3 text-right"\>Status\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3 font-mono font-bold text-indigo-600"\>PO-2026-8801\</td\>  
              \<td class="p-3 font-mono text-xs text-gray-700"\>ASN-8819 (John Doe)\</td\>  
              \<td class="p-3 font-extrabold text-gray-900"\>$50,000.00 USD\</td\>  
              \<td class="p-3 text-right"\>\<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>ACTIVE\</span\>\</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# Invoices & Billing

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>VENDOR AGENCY PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>TA\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>Apex Talent Agency\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📊 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💼 Open Requisitions\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📤 Candidate Submissions\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📋 Deployed Contractors\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💳 Purchase Orders\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>🧾 Invoices & Billing\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<h1 class="text-2xl font-bold text-gray-900 mb-6"\>Agency Billing & Invoices\</h1\>  
      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>Invoice Number\</th\>  
              \<th class="p-3"\>PO Reference\</th\>  
              \<th class="p-3"\>Total Amount\</th\>  
              \<th class="p-3 text-right"\>Payment Status\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3 font-mono font-bold text-indigo-600"\>INV-2026-0891\</td\>  
              \<td class="p-3 font-mono text-xs text-gray-700"\>PO-2026-8801\</td\>  
              \<td class="p-3 font-extrabold text-green-700"\>$3,527.50\</td\>  
              \<td class="p-3 text-right"\>\<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full"\>SUBMITTED\</span\>\</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# Contractor


# Contractor Dashboard

**Contractor DashBoard**

\<div class="min-h-screen bg-gray-50 font-sans"\>

 

  \<\!-- Top Navigation Bar \--\>

  \<nav class="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm"\>

    \<div class="flex items-center space-x-3"\>

      \<span class="font-black text-2xl text-blue-600 tracking-tight"\>GigForce\</span\>

      \<span class="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-200"\>

        Contractor Portal\[cite: 1\]

      \</span\>

    \</div\>

   

    \<div class="flex items-center space-x-6"\>

      \<div class="relative w-64 hidden sm:block"\>

        \<input type="text" placeholder="Search assignments, timesheets..." class="w-full bg-gray-100 rounded-lg py-1.5 px-4 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500" /\>

      \</div\>

     

      \<\!-- Notifications Bell (GET /api/v1/notifications/unread-count) \--\>

      \<div class="relative cursor-pointer p-1 text-gray-500 hover:text-gray-700"\>

        \<span class="absolute \-top-1 \-right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-\[10px\] text-white font-bold ring-2 ring-white"\>

          2

        \</span\>

        \<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"\>\<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"\>\</path\>\</svg\>

      \</div\>

 

      \<\!-- User Profile \--\>

      \<div class="flex items-center space-x-3 border-l pl-6 cursor-pointer"\>

        \<div class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm"\>

          JD

        \</div\>

        \<span class="text-sm font-medium text-gray-700"\>John Doe \<span class="text-gray-400 text-xs ml-1"\>▼\</span\>\</span\>

      \</div\>

    \</div\>

  \</nav\>

 

  \<div class="flex"\>

    \<\!-- Left Navigation Sidebar \--\>

    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>

      \<div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3"\>Menu\</div\>

      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>

        \<li class="bg-blue-50 text-blue-700 px-3 py-2.5 rounded-lg cursor-pointer flex items-center font-bold"\>

          \<span class="mr-3 text-lg"\>🏠\</span\> Dashboard\[cite: 1\]

        \</li\>

        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center transition"\>

          \<span class="mr-3 text-lg"\>👤\</span\> My Profile\[cite: 1\]

        \</li\>

        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center transition"\>

          \<span class="mr-3 text-lg"\>📋\</span\> My Assignments\[cite: 1\]

        \</li\>

        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center transition"\>

          \<span class="mr-3 text-lg"\>⏱️\</span\> Weekly Timesheets\[cite: 1\]

        \</li\>

        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center transition"\>

          \<span class="mr-3 text-lg"\>🏖️\</span\> Leave & Absences\[cite: 1\]

        \</li\>

        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center transition"\>

          \<span class="mr-3 text-lg"\>💵\</span\> Payment History\[cite: 1\]

        \</li\>

      \</ul\>

    \</aside\>

 

    \<\!-- Main Workspace \--\>

    \<main class="flex-1 p-8"\>

     

      \<\!-- Welcome Header Section \--\>

      \<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"\>

        \<div\>

          \<h1 class="text-2xl font-bold text-gray-900"\>Welcome back, John\!\</h1\>

          \<p class="text-sm text-gray-500 mt-0.5"\>Here is your workforce activity and earnings summary for this week\[cite: 1\].\</p\>

        \</div\>

 

        \<div class="flex items-center space-x-3"\>

          \<button class="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition"\>

            Request Leave (POST /absences)\[cite: 1\]

          \</button\>

          \<button class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-md shadow-blue-600/20 transition flex items-center"\>

            \<span class="mr-1.5 text-base"\>+\</span\> Log Timesheet (POST /timesheets)\[cite: 1\]

          \</button\>

        \</div\>

      \</div\>

 

      \<\!-- KPI Metrics Row (GET /api/v1/reports/personal-dashboard) \--\>

      \<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"\>

       

        \<\!-- Active Assignments \--\>

        \<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 flex items-center"\>

          \<div class="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl mr-4"\>

            💼

          \</div\>

          \<div\>

            \<p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5"\>Active Assignments\[cite: 1\]\</p\>

            \<h3 class="text-2xl font-black text-gray-900"\>2\</h3\>

          \</div\>

        \</div\>

 

        \<\!-- Pending Timesheets \--\>

        \<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 flex items-center"\>

          \<div class="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 text-2xl mr-4"\>

            ⏱️

          \</div\>

          \<div\>

            \<p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5"\>Pending Timesheets\[cite: 1\]\</p\>

            \<h3 class="text-2xl font-black text-gray-900"\>1\</h3\>

          \</div\>

        \</div\>

 

        \<\!-- Total Hours Logged \--\>

        \<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 flex items-center"\>

          \<div class="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 text-2xl mr-4"\>

            ⌛

          \</div\>

          \<div\>

            \<p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5"\>Total Hours Logged\[cite: 1\]\</p\>

            \<h3 class="text-2xl font-black text-gray-900"\>124.5 \<span class="text-xs font-medium text-gray-500"\>hrs\</span\>\</h3\>

          \</div\>

        \</div\>

 

        \<\!-- Total Paid Amount \--\>

        \<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80 flex items-center"\>

          \<div class="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 text-2xl mr-4"\>

            💰

          \</div\>

          \<div\>

            \<p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5"\>Total Paid Amount\[cite: 1\]\</p\>

            \<h3 class="text-2xl font-black text-gray-900"\>$8,450.00\</h3\>

          \</div\>

        \</div\>

 

      \</div\>

 

      \<\!-- Lower Section: Active Engagement (Left 2 Cols) & Quick Actions (Right 1 Col) \--\>

      \<div class="grid grid-cols-1 lg:grid-cols-3 gap-8"\>

       

        \<\!-- Active Assignment & Recent Timesheets Grid \--\>

        \<div class="lg:col-span-2 space-y-8"\>

         

          \<\!-- Current Active Assignment Card (GET /api/v1/assignments) \--\>

          \<div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6"\>

            \<div class="flex justify-between items-center pb-4 mb-4 border-b border-gray-100"\>

              \<div\>

                \<h2 class="text-base font-bold text-gray-900"\>Current Assignment Details\[cite: 1\]\</h2\>

                \<p class="text-xs text-gray-400 font-mono"\>ASG-2026-0912\[cite: 1\]\</p\>

              \</div\>

              \<span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase"\>

                ACTIVE\[cite: 1\]

              \</span\>

            \</div\>

 

            \<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-gray-50 p-4 rounded-xl text-xs"\>

              \<div\>

                \<p class="text-gray-400 font-semibold uppercase"\>Role Title\[cite: 1\]\</p\>

                \<p class="font-bold text-gray-800 mt-1"\>Senior React Developer\[cite: 1\]\</p\>

              \</div\>

              \<div\>

                \<p class="text-gray-400 font-semibold uppercase"\>Agreed Daily Rate\[cite: 1\]\</p\>

                \<p class="font-bold text-gray-800 mt-1"\>$680.00 / day\[cite: 1\]\</p\>

              \</div\>

              \<div\>

                \<p class="text-gray-400 font-semibold uppercase"\>Engagement Type\[cite: 1\]\</p\>

                \<p class="font-bold text-gray-800 mt-1"\>REMOTE\[cite: 1\]\</p\>

              \</div\>

            \</div\>

 

            \<div class="flex justify-between items-center text-xs text-gray-500 pt-1"\>

              \<span\>Duration: Oct 01, 2026 – Dec 31, 2026\[cite: 1\]\</span\>

              \<a href="\#" class="text-blue-600 font-bold hover:underline"\>View Statement of Work (SOW) →\[cite: 1\]\</a\>

            \</div\>

          \</div\>

 

          \<\!-- Recent Weekly Timesheets Table (GET /api/v1/timesheets) \--\>

          \<div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6"\>

            \<div class="flex justify-between items-center pb-4 mb-4 border-b border-gray-100"\>

              \<h2 class="text-base font-bold text-gray-900"\>Recent Timesheets\[cite: 1\]\</h2\>

              \<a href="\#" class="text-xs text-blue-600 font-bold hover:underline"\>View All Timesheets →\[cite: 1\]\</a\>

            \</div\>

 

            \<div class="space-y-3"\>

             

              \<\!-- Approved Timesheet Item \--\>

              \<div class="flex justify-between items-center p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition"\>

                \<div\>

                  \<p class="font-bold text-sm text-gray-800"\>Week of Oct 12 – Oct 16, 2026\[cite: 1\]\</p\>

                  \<p class="text-xs text-gray-500 mt-0.5"\>Logged: 40.0 hrs (Regular)\[cite: 1\]\</p\>

                \</div\>

                \<div class="flex items-center space-x-4"\>

                  \<span class="text-sm font-black text-gray-800"\>$3,400.00\[cite: 1\]\</span\>

                  \<span class="bg-emerald-100 text-emerald-800 text-\[11px\] font-bold px-3 py-1 rounded-full uppercase"\>

                    APPROVED\[cite: 1\]

                  \</span\>

                \</div\>

              \</div\>

 

              \<\!-- Draft Timesheet Item \--\>

              \<div class="flex justify-between items-center p-4 border border-gray-100 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition"\>

                \<div\>

                  \<p class="font-bold text-sm text-gray-800"\>Week of Oct 19 – Oct 23, 2026\[cite: 1\]\</p\>

                  \<p class="text-xs text-gray-500 mt-0.5"\>Logged: 32.5 hrs (Mon-Thu)\[cite: 1\]\</p\>

                \</div\>

                \<div class="flex items-center space-x-4"\>

                  \<span class="text-sm font-black text-gray-800"\>$2,762.50\[cite: 1\]\</span\>

                  \<span class="bg-gray-200 text-gray-700 text-\[11px\] font-bold px-3 py-1 rounded-full uppercase"\>

                    DRAFT\[cite: 1\]

                  \</span\>

                \</div\>

              \</div\>

 

            \</div\>

          \</div\>

 

        \</div\>

 

        \<\!-- Right Side Panel: Quick Actions & Profile Completion \--\>

        \<div class="space-y-6"\>

         

          \<\!-- Quick Links Widget \--\>

          \<div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6"\>

            \<h2 class="text-base font-bold text-gray-900 border-b pb-3 mb-4"\>Quick Shortcuts\</h2\>

           

            \<div class="space-y-2"\>

              \<a href="\#" class="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition group"\>

                \<div class="flex items-center space-x-3"\>

                  \<span class="text-base"\>⏱️\</span\>

                  \<span class="text-xs font-bold text-gray-700 group-hover:text-blue-700"\>Open Current Timesheet Draft\[cite: 1\]\</span\>

                \</div\>

                \<span class="text-gray-400 text-xs"\>→\</span\>

              \</a\>

 

              \<a href="\#" class="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition group"\>

                \<div class="flex items-center space-x-3"\>

                  \<span class="text-base"\>💼\</span\>

                  \<span class="text-xs font-bold text-gray-700 group-hover:text-blue-700"\>Browse Open Requisitions\[cite: 1\]\</span\>

                \</div\>

                \<span class="text-gray-400 text-xs"\>→\</span\>

              \</a\>

 

              \<a href="\#" class="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition group"\>

                \<div class="flex items-center space-x-3"\>

                  \<span class="text-base"\>⚙️\</span\>

                  \<span class="text-xs font-bold text-gray-700 group-hover:text-blue-700"\>Update Profile Skills & Rates\[cite: 1\]\</span\>

                \</div\>

                \<span class="text-gray-400 text-xs"\>→\</span\>

              \</a\>

            \</div\>

          \</div\>

 

          \<\!-- Pending Absence Requests Widget \--\>

          \<div class="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6"\>

            \<div class="flex justify-between items-center border-b pb-3 mb-4"\>

              \<h2 class="text-base font-bold text-gray-900"\>Leave Requests\[cite: 1\]\</h2\>

              \<span class="text-\[10px\] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded"\>1 Pending\[cite: 1\]\</span\>

            \</div\>

 

            \<div class="p-3.5 rounded-xl border border-gray-100 bg-gray-50 text-xs"\>

              \<div class="flex justify-between items-start mb-1"\>

                \<span class="font-bold text-gray-800"\>Casual Leave\[cite: 1\]\</span\>

                \<span class="text-\[10px\] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded"\>PENDING\[cite: 1\]\</span\>

              \</div\>

              \<p class="text-gray-500 text-\[11px\]"\>Nov 02, 2026 (Full Day)\[cite: 1\]\</p\>

              \<p class="text-gray-400 text-\[10px\] mt-2 border-t pt-1"\>Reason: Personal medical appointment\[cite: 1\]\</p\>

            \</div\>

          \</div\>

 

        \</div\>

 

      \</div\>

 

    \</main\>

  \</div\>

\</div\>

# Profile

\<div class\="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class\="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class\="flex items-center space-x-3"\>  
      \<span class\="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class\="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>CONTRACTOR PORTAL\</span\>  
    \</div\>  
    \<div class\="flex items-center space-x-3"\>  
      \<div class\="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>JD\</div\>  
      \<span class\="text-sm font-medium text-slate-200"\>John Doe\</span\>  
    \</div\>  
  \</nav\>

  \<div class\="flex"\>  
    \<aside class\="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class\="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏠 Dashboard\</li\>  
        \<li class\="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>👤 My Profile\</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📋 My Assignments\</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>⏱️ Weekly Timesheets\</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏖️ Leave & Absences\</li\>  
        \<li class\="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💵 Payment History\</li\>  
      \</ul\>  
    \</aside\>

    \<main class\="flex-1 p-8"\>  
      \<div class\="max-w-4xl space-y-6"\>  
        \<h1 class\="text-2xl font-bold text-gray-900"\>Contractor Profile\</h1\>

        \<div class\="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
          \<div class\="flex items-center space-x-5 pb-6 border-b"\>  
            \<div class\="h-16 w-16 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center"\>JD\</div\>  
            \<div\>  
              \<h2 class\="text-xl font-bold text-gray-900"\>John Doe\</h2\>  
              \<p class\="text-xs text-gray-500"\>Senior Full-Stack Engineer • Remote\</p\>  
              \<span class\="mt-2 inline-block bg-green-100 text-green-800 text-\[10px\] font-bold px-2 py-0.5 rounded-full"\>AVAILABLE\</span\>  
            \</div\>  
          \</div\>

          \<form class\="grid grid-cols-2 gap-4 pt-6 text-xs"\>  
            \<div\>  
              \<label class\="block font-bold text-gray-700 uppercase mb-1"\>Full Name\</label\>  
              \<input type\="text" value\="John Doe" class\="w-full border rounded-lg p-2.5 bg-gray-50" readonly /\>  
            \</div\>  
            \<div\>  
              \<label class\="block font-bold text-gray-700 uppercase mb-1"\>Email\</label\>  
              \<input type\="email" value\="john.doe@example.com" class\="w-full border rounded-lg p-2.5 bg-gray-50" readonly /\>  
            \</div\>  
            \<div\>  
              \<label class\="block font-bold text-gray-700 uppercase mb-1"\>Hourly Rate ($)\</label\>  
              \<input type\="text" value\="$85.00 / hr" class\="w-full border rounded-lg p-2.5 bg-gray-50" readonly /\>  
            \</div\>  
            \<div\>  
              \<label class\="block font-bold text-gray-700 uppercase mb-1"\>Primary Skill\</label\>  
              \<input type\="text" value\="Java Spring Boot / React" class\="w-full border rounded-lg p-2.5 bg-gray-50" readonly /\>  
            \</div\>  
          \</form\>  
        \</div\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# My Assignment

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>CONTRACTOR PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>JD\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>John Doe\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏠 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>👤 My Profile\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>📋 My Assignments\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>⏱️ Weekly Timesheets\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏖️ Leave & Absences\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💵 Payment History\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<h1 class="text-2xl font-bold text-gray-900 mb-6"\>Active & Past Assignments\</h1\>

      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>Assignment ID / Role\</th\>  
              \<th class="p-3"\>Client Agency\</th\>  
              \<th class="p-3"\>Agreed Rate\</th\>  
              \<th class="p-3"\>Duration\</th\>  
              \<th class="p-3 text-right"\>Status\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3"\>  
                \<p class="font-bold text-gray-900"\>Sr. Java Engineer\</p\>  
                \<p class="text-xs font-mono text-indigo-600"\>ASN-2026-8819\</p\>  
              \</td\>  
              \<td class="p-3 font-semibold text-gray-800"\>Apex Talent Agency\</td\>  
              \<td class="p-3 font-extrabold text-gray-900"\>$680.00 / day\</td\>  
              \<td class="p-3 text-xs text-gray-500"\>Jul 01, 2026 – Dec 31, 2026\</td\>  
              \<td class="p-3 text-right"\>\<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>ACTIVE\</span\>\</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# Weekly Timesheet

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>CONTRACTOR PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>JD\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>John Doe\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏠 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>👤 My Profile\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📋 My Assignments\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>⏱️ Weekly Timesheets\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏖️ Leave & Absences\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💵 Payment History\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<div class="flex justify-between items-center mb-6"\>  
        \<h1 class="text-2xl font-bold text-gray-900"\>Weekly Timesheet Submissions\</h1\>  
        \<button class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow"\>+ Log New Week\</button\>  
      \</div\>

      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>Period\</th\>  
              \<th class="p-3"\>Assignment Ref\</th\>  
              \<th class="p-3"\>Hours Logged\</th\>  
              \<th class="p-3"\>Calculated Pay\</th\>  
              \<th class="p-3 text-right"\>Status\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3 font-bold text-gray-900"\>Jul 13 – Jul 17, 2026\</td\>  
              \<td class="p-3 font-mono text-xs text-indigo-600"\>ASN-2026-8819\</td\>  
              \<td class="p-3 font-bold text-gray-800"\>41.5 hrs\</td\>  
              \<td class="p-3 font-extrabold text-green-700"\>$3,527.50\</td\>  
              \<td class="p-3 text-right"\>\<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full"\>SUBMITTED\</span\>\</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# Leave & Absences Page

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>CONTRACTOR PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>JD\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>John Doe\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏠 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>👤 My Profile\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📋 My Assignments\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>⏱️ Weekly Timesheets\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>🏖️ Leave & Absences\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>💵 Payment History\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<div class="flex justify-between items-center mb-6"\>  
        \<h1 class="text-2xl font-bold text-gray-900"\>Leave Requests & Absences\</h1\>  
        \<button class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow"\>+ Request Leave\</button\>  
      \</div\>

      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>Type\</th\>  
              \<th class="p-3"\>Date\</th\>  
              \<th class="p-3"\>Reason\</th\>  
              \<th class="p-3 text-right"\>Status\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3 font-bold text-indigo-700"\>Casual Leave\</td\>  
              \<td class="p-3 text-xs text-gray-700 font-semibold"\>Aug 02, 2026 (Full Day)\</td\>  
              \<td class="p-3 text-xs text-gray-500"\>Personal medical appointment\</td\>  
              \<td class="p-3 text-right"\>\<span class="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full"\>PENDING\</span\>\</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>

# Payment History Page

\<div class="min-h-screen bg-gray-50 font-sans"\>  
  \<nav class="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center text-white shadow-md"\>  
    \<div class="flex items-center space-x-3"\>  
      \<span class="font-bold text-2xl text-indigo-400 tracking-tight"\>GigForce\</span\>  
      \<span class="bg-indigo-900 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-700/50"\>CONTRACTOR PORTAL\</span\>  
    \</div\>  
    \<div class="flex items-center space-x-3"\>  
      \<div class="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm"\>JD\</div\>  
      \<span class="text-sm font-medium text-slate-200"\>John Doe\</span\>  
    \</div\>  
  \</nav\>

  \<div class="flex"\>  
    \<aside class="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6 shadow-sm"\>  
      \<ul class="space-y-1 text-sm font-medium text-gray-600"\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏠 Dashboard\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>👤 My Profile\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>📋 My Assignments\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>⏱️ Weekly Timesheets\</li\>  
        \<li class="px-3 py-2.5 hover:bg-gray-50 rounded-md cursor-pointer"\>🏖️ Leave & Absences\</li\>  
        \<li class="bg-indigo-50 text-indigo-700 px-3 py-2.5 rounded-md font-bold"\>💵 Payment History\</li\>  
      \</ul\>  
    \</aside\>

    \<main class="flex-1 p-8"\>  
      \<h1 class="text-2xl font-bold text-gray-900 mb-6"\>Payment Disbursement History\</h1\>

      \<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"\>  
        \<table class="w-full text-left border-collapse"\>  
          \<thead\>  
            \<tr class="border-b text-xs font-bold text-gray-400 uppercase bg-gray-50"\>  
              \<th class="p-3"\>Payment ID\</th\>  
              \<th class="p-3"\>Invoice Ref\</th\>  
              \<th class="p-3"\>Disbursed Date\</th\>  
              \<th class="p-3"\>Amount\</th\>  
              \<th class="p-3 text-right"\>Status\</th\>  
            \</tr\>  
          \</thead\>  
          \<tbody class="divide-y text-sm"\>  
            \<tr class="hover:bg-gray-50"\>  
              \<td class="p-3 font-mono font-bold text-gray-900"\>PAY-2026-1049\</td\>  
              \<td class="p-3 font-mono text-xs text-indigo-600"\>INV-2026-0880\</td\>  
              \<td class="p-3 text-xs text-gray-600"\>Jul 18, 2026\</td\>  
              \<td class="p-3 font-extrabold text-green-700"\>$3,400.00\</td\>  
              \<td class="p-3 text-right"\>\<span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full"\>PROCESSED\</span\>\</td\>  
            \</tr\>  
          \</tbody\>  
        \</table\>  
      \</div\>  
    \</main\>  
  \</div\>  
\</div\>  
