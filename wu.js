/*

	wu.js 1.0.1 (c) 2010 LogMeIn, Inc. All Rights Reserved.

	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions are met:
	
	1. Redistributions of source code must retain the above copyright notice,
	   this list of conditions and the following disclaimer.
	2. Redistributions in binary form must reproduce the above copyright notice,
	   this list of conditions and the following disclaimer in the documentation
	   and/or other materials provided with the distribution.
	3. Neither the name of LogMeIn, Inc. nor the names
	   of its contributors may be used to endorse or promote products derived
	   from this software without specific prior written permission.
	
	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
	AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
	ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
	LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
	CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
	SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
	INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
	CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
	ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
	POSSIBILITY OF SUCH DAMAGE.	
*/

var updateSession 		= WScript.CreateObject("Microsoft.Update.Session");
var updateSearcher 		= updateSession.CreateupdateSearcher();
var updatesToDownload = WScript.CreateObject("Microsoft.Update.UpdateColl");
var downloader 				= updateSession.CreateUpdateDownloader();
var updatesToInstall 	= WScript.CreateObject("Microsoft.Update.UpdateColl");

function strRight(s, n) {
	return s.substr(s.length-n, n);
}

function strPad(s, n) {
	while (s.length < n) {
		s += "                ";
	}
	return s.substr(0, n);
}

function resultCodeToStr(c) {
	switch (c) {
		case 0:
			return "Not Started";
		case 1:
			return "In Progress";
		case 2:
			return "Succeeded";
		case 3:
			return "Succeeded with Errors";
		case 4:
			return "Failed";
		case 5:
			return "Aborted";
	}
	return "Unknown";
}

function displayHelp() {
	WScript.Echo("Valid parameters:");
	WScript.Echo("    /i    Download and install updates (default: display updates only)");
	WScript.Echo("    /?    Show this help screen");
	WScript.Echo("");
	WScript.Echo("    /ae   Accept EULAs for updates that require it");
	WScript.Echo("    /r    Reboot at the end of installation if necessary");
	WScript.Echo("");
	WScript.Echo("    /si   Include already installed updates (not compatible with /i switch)");
	WScript.Echo("    /si-  Exclude already installed updates (default)");
	WScript.Echo("    /sa   Include only updates that are auto-selected by Windows Update (recommended)");
	WScript.Echo("    /std  Include driver updates (default)");
	WScript.Echo("    /std- Exclude driver updates");
	WScript.Echo("    /sts  Include software updates (default)");
	WScript.Echo("    /sts- Exclude software updates");
	WScript.Echo("");
}

function reboot() {
	var o = GetObject("winmgmts:{impersonationLevel=impersonate,(Shutdown)}!\\\\.\\root\\cimv2").ExecQuery("select * from Win32_OperatingSystem");
	var e = new Enumerator(o);
	for (;!e.atEnd(); e.moveNext()) {
		var os = e.item();
		os.Win32Shutdown(2+4); // (2= reboot, 4=force)
	}
}

var actionInstall 					= false;
var acceptEula 							= false;
var includeAlreadyInstalled = false;
var includeAutoSelectOnly 	= false;
var includeDriver 					= true;
var includeSoftware 				= true;
var rebootWhenNeeded				= false;
var searchStr 							= "";

for (var i=0; i<WScript.Arguments.Count(); i++) {
	var arg = WScript.Arguments.Item(i);
	if (arg == "/?") {
		displayHelp();
		WScript.Quit();
	} else if (arg == "/i") {
		actionInstall = true;
	} else if (arg == "/ae") {
		acceptEula = true;
	} else if (arg == "/si") {
		includeAlreadyInstalled = true;
	} else if (arg == "/sa") {
		includeAutoSelectOnly = true;
	} else if (arg == "/std-") {
		includeDriver = false;
	} else if (arg == "/sts-") {
		includeSoftware = false;
	} else if (arg == "/r") {
		rebootWhenNeeded = true;
	} else {
		WScript.Echo("Invalid argument " + arg);
		displayHelp();
		WScript.Quit(1);
	}
}

if (actionInstall && includeAlreadyInstalled) {
		WScript.Echo("Cannot install updates that have already been installed (incompatible flags /i and /si)");
		WScript.Quit(1);
}

if (includeAlreadyInstalled) {
	searchStr = "(IsInstalled=1)";
} else {
	searchStr = "(IsInstalled=0)";
}

if (includeAutoSelectOnly) {
	searchStr += " and (AutoSelectOnWebsites=1)";
}

if (includeDriver && includeSoftware) {
	// this is the default in the search string so nothing to do
} else {
	if (includeSoftware) {
		searchStr += " and (Type='Software')";
	} else if (includeDriver) {
		searchStr += " and (Type='Driver')";
	} else {
		WScript.Echo("Cannot exclude both software and drivers.");
		WScript.Quit(1);
	}
}

WScript.Echo("Searching for updates: " + searchStr + "\n");

var searchResult = updateSearcher.Search(searchStr);

if (searchResult.Updates.Count == 0) {
	WScript.Echo("There are no applicable updates.");
	WScript.Quit();
}

for (var i=0; i<searchResult.Updates.Count; i++) {
    var update = searchResult.Updates.Item(i);
    var articles = update.KBArticleIDs;
    var cat = update.Categories;
		
		if (actionInstall) {
    	updatesToDownload.Add(update);
		} else {
			var m = articles.Count;
			if (cat.Count > articles.Count)
				m = cat.Count;
				
			for (var d=0; d<m; d++) {
		    var articlestr = "";
	    	if (d < articles.Count) {
	    		articlestr = "KB" + articles.Item(d);
	    	}
		    
		    var catstr = "";
		    if (d < cat.Count) {
		    		catstr = cat.Item(d).Name;
		    }
		    
		    if (d ==0) {
			    WScript.Echo( strRight("000" + (i+1), 4) + ": " 
			    	+ (update.IsInstalled ? "I" : " ") 
			    	+ (update.AutoSelectOnWebSites ? "A" : " ") 
			    	+ (update.EulaAccepted ? "E" : " ")
			    	+ " "
			    	+ strPad(articlestr, 14) + " " 
			    	+ strPad(catstr, 40) + " " 
			    	+ update.Title
			    	);
		    } else {
			    WScript.Echo( "          "
			    	+ strPad(articlestr, 14) + " "
			    	+ strPad(catstr, 40) + " "
			    	);
		    }
			}
		}
}

if (actionInstall) {

	WScript.Echo("");

	if (updatesToDownload.Count == 0) {
		WScript.Echo("There are no updates to download.");
		WScript.Quit(0);
	}

	WScript.Echo("Downloading " + updatesToDownload.Count + " updates...");
	downloader.Updates = updatesToDownload;
	downloader.Download();
	WScript.Echo("...done.");

	for (var i=0; i<searchResult.Updates.Count; i++) {
	    var update = searchResult.Updates.Item(i);
			if (update.IsDownloaded) {
				if (update.EulaAccepted) {
					updatesToInstall.Add(update);
				} else {
					if (acceptEula) {
						update.AcceptEula();
						updatesToInstall.Add(update);
					} else {
						WScript.Echo("Skipping update that requires the acceptance of an EULA (use /ae flag): " + update.Title);
					}
				}
			}
	}

	if (updatesToInstall.Count == 0) {
		WScript.Echo("There are no updates to install.");
		WScript.Quit(0);
	}
	
	WScript.Echo("Installing " + updatesToInstall.Count + " updates...");
	var installer = updateSession.CreateUpdateInstaller();
	installer.Updates = updatesToInstall;
	installer.AllowSourcePrompts = false;
	installer.ForceQuiet = true;
	var installationResult = installer.Install();
	WScript.Echo("...done.");

	WScript.Echo("");
	WScript.Echo("Installation Result: " + resultCodeToStr(installationResult.ResultCode));
	WScript.Echo("Reboot Required: " + (installationResult.RebootRequired ? "YES" : "No"));
	WScript.Echo("");
	WScript.Echo("Updates installed:");
	WScript.Echo("");
	
	for (var i=0; i<updatesToInstall.Count; i++) {
		WScript.Echo( strRight("000" + (i+1), 4) + ": " + resultCodeToStr(installationResult.GetUpdateResult(i).ResultCode) + ": " + updatesToInstall.Item(i).Title);
	}
	
	if (installationResult.RebootRequired && rebootWhenNeeded) {
		WScript.Echo("");
		WScript.Echo("Initiating reboot.");
		reboot();
	}

	WScript.Quit((installationResult.ResultCode == 2) ? 0 : 2);	
}
