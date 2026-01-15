package com.fleur.attendance.ui.attendance.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.fleur.attendance.R
import com.fleur.attendance.data.model.AttendanceHistoryItem
import com.fleur.attendance.databinding.ItemAttendanceHistoryBinding
import java.text.SimpleDateFormat
import java.util.*

class AttendanceHistoryAdapter : ListAdapter<AttendanceHistoryItem, AttendanceHistoryAdapter.ViewHolder>(DiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemAttendanceHistoryBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    class ViewHolder(private val binding: ItemAttendanceHistoryBinding) : RecyclerView.ViewHolder(binding.root) {
        
        fun bind(item: AttendanceHistoryItem) {
            binding.apply {
                // Format date and time
                tvDate.text = formatDate(item.date)
                tvTime.text = formatTimeFromISO(item.time)
                
                // Location status
                tvLocationStatus.text = if (item.location.isValid) "Dalam Area" else "Luar Area"
                tvDistance.text = "${item.location.distance.toInt()}m"
                
                // Set location status color
                val statusColor = if (item.location.isValid) {
                    R.color.success_green
                } else {
                    R.color.warning_yellow
                }
                tvLocationStatus.setTextColor(itemView.context.getColor(statusColor))
                
                // Show attendance type (Clock In / Clock Out)
                tvVerificationMethod.text = when (item.type) {
                    "clock_in" -> "Clock In"
                    "clock_out" -> "Clock Out"
                    else -> item.type.capitalize()
                }
            }
        }
        
        private fun formatDate(dateString: String): String {
            return try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                val outputFormat = SimpleDateFormat("dd MMM yyyy", Locale.getDefault())
                val date = inputFormat.parse(dateString)
                outputFormat.format(date ?: Date())
            } catch (e: Exception) {
                dateString
            }
        }
        
        private fun formatTimeFromISO(isoTime: String?): String {
            if (isoTime == null) return "--:--"
            
            return try {
                // Parse ISO 8601 timestamp (e.g., "2026-01-14T12:33:10.00Z")
                val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                inputFormat.timeZone = TimeZone.getTimeZone("UTC")
                
                val date = inputFormat.parse(isoTime.replace("Z", "").substring(0, 19))
                
                // Format ke HH:mm dalam timezone lokal
                val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                outputFormat.timeZone = TimeZone.getDefault()
                
                outputFormat.format(date ?: return "--:--")
            } catch (e: Exception) {
                // Fallback: coba ambil jam:menit langsung dari string
                try {
                    val timePart = isoTime.split("T").getOrNull(1)?.substring(0, 5)
                    timePart ?: "--:--"
                } catch (ex: Exception) {
                    "--:--"
                }
            }
        }
    }
    
    class DiffCallback : DiffUtil.ItemCallback<AttendanceHistoryItem>() {
        override fun areItemsTheSame(oldItem: AttendanceHistoryItem, newItem: AttendanceHistoryItem): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: AttendanceHistoryItem, newItem: AttendanceHistoryItem): Boolean {
            return oldItem == newItem
        }
    }
}