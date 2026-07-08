package expo.modules.screentime

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Calendar

class ExpoScreenTimeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoScreenTime")

    Function("hasUsagePermission") {
      val context = appContext.reactContext ?: return@Function false
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        Process.myUid(),
        context.packageName
      )
      mode == AppOpsManager.MODE_ALLOWED
    }

    Function("requestUsagePermission") {
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      null
    }

    Function("getDailyUsageStats") {
      val context = appContext.reactContext ?: return@Function emptyMap<String, Long>()
      val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      
      val calendar = Calendar.getInstance()
      calendar.set(Calendar.HOUR_OF_DAY, 0)
      calendar.set(Calendar.MINUTE, 0)
      calendar.set(Calendar.SECOND, 0)
      calendar.set(Calendar.MILLISECOND, 0)
      
      val startTime = calendar.timeInMillis
      val endTime = System.currentTimeMillis()
      
      val stats = usageStatsManager.queryAndAggregateUsageStats(startTime, endTime)
      
      val result = mutableMapOf<String, Long>()
      for ((packageName, usageStats) in stats) {
        val timeInForeground = usageStats.totalTimeInForeground
        if (timeInForeground > 0) {
          result[packageName] = timeInForeground
        }
      }
      
      result
    }
  }
}
