' -----------------------------------------------------------------------------------------------------
' -				XP SCRIPT
' - 			Turn off System Restore on all Drives
' -
' - 	
' - 
' -----------------------------------------------------------------------------------------------------
WScript.Echo "Starting VB Script " 

strComputer = "."

Set objWMIService = GetObject("winmgmts:\\" & strComputer & "\root\default")

Set objItem = objWMIService.Get("SystemRestore")

WScript.Echo "Disabling System Restore on all drives "

errResults = objItem.Disable("")

WScript.Echo "Exiting VB Script "
WScript.Quit
' -----------------------------------------------------------------------------------------------------
' -				Copyright (C) 2003-2010 LogMeIn, Inc. US patents pending.
' -				This script can be re-distributed for demonstration purposes only.
' -				Use of this script is subject to general Logmein Terms and Conditions found here:
' -				https://secure.logmein.com/termsandconditions.asp
' -----------------------------------------------------------------------------------------------------