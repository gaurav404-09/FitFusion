package com.g4ur4v.FitFusion

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StepCounterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "StepCounterModule"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    try {
      val sensorManager = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
      val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      promise.resolve(sensor != null)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun getStepCounter(promise: Promise) {
    try {
      val sensorManager = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
      val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (sensor == null) {
        promise.resolve(null)
        return
      }

      var resolved = false
      val listener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent?) {
          if (resolved) return
          resolved = true
          try {
            val value = event?.values?.getOrNull(0)
            promise.resolve(value?.toDouble())
          } catch (e: Exception) {
            promise.resolve(null)
          } finally {
            sensorManager.unregisterListener(this)
          }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
      }

      val registered = sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
      if (!registered) {
        sensorManager.unregisterListener(listener)
        promise.resolve(null)
      }
    } catch (e: Exception) {
      promise.resolve(null)
    }
  }
}

