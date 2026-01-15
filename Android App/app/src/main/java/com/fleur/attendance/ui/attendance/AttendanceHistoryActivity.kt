package com.fleur.attendance.ui.attendance

import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.fleur.attendance.data.api.LegacyApiAdapter
import com.fleur.attendance.data.model.AttendanceHistoryItem
import com.fleur.attendance.databinding.ActivityAttendanceHistoryBinding
import com.fleur.attendance.ui.attendance.adapter.AttendanceHistoryAdapter
import com.fleur.attendance.utils.SessionManager
import com.google.android.material.tabs.TabLayout

class AttendanceHistoryActivity : AppCompatActivity() {
    private lateinit var binding: ActivityAttendanceHistoryBinding
    private lateinit var apiAdapter: LegacyApiAdapter
    private lateinit var sessionManager: SessionManager
    private lateinit var attendanceAdapter: AttendanceHistoryAdapter
    private var allRecords: List<AttendanceHistoryItem> = emptyList()
    private var currentFilter: String = "all" // "all", "clock_in", "clock_out"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAttendanceHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        apiAdapter = LegacyApiAdapter(this)
        sessionManager = SessionManager(this)
        
        setupToolbar()
        setupTabs()
        setupRecyclerView()
        loadAttendanceHistory()
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Riwayat Absensi"
    }
    
    private fun setupTabs() {
        binding.tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                when (tab?.position) {
                    0 -> {
                        currentFilter = "all"
                        filterRecords()
                    }
                    1 -> {
                        currentFilter = "clock_in"
                        filterRecords()
                    }
                    2 -> {
                        currentFilter = "clock_out"
                        filterRecords()
                    }
                }
            }
            
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }
    
    private fun setupRecyclerView() {
        attendanceAdapter = AttendanceHistoryAdapter()
        binding.recyclerViewAttendance.apply {
            layoutManager = LinearLayoutManager(this@AttendanceHistoryActivity)
            adapter = attendanceAdapter
        }
    }
    
    private fun loadAttendanceHistory() {
        showLoading(true)
        
        apiAdapter.getEmployeeAttendanceHistory(
            limit = 50,
            onSuccess = { records ->
                showLoading(false)
                allRecords = records
                filterRecords()
            },
            onError = { error ->
                showLoading(false)
                Log.e("AttendanceHistory", "Error: $error")
                showError("Gagal memuat riwayat: $error")
            }
        )
    }
    
    private fun filterRecords() {
        val filteredRecords = when (currentFilter) {
            "clock_in" -> allRecords.filter { it.type == "clock_in" }
            "clock_out" -> allRecords.filter { it.type == "clock_out" }
            else -> allRecords
        }
        
        attendanceAdapter.submitList(filteredRecords)
        
        if (filteredRecords.isEmpty()) {
            showEmptyState()
        } else {
            binding.tvEmptyState.visibility = View.GONE
            binding.recyclerViewAttendance.visibility = View.VISIBLE
        }
    }
    
    private fun showLoading(show: Boolean) {
        binding.progressBar.visibility = if (show) View.VISIBLE else View.GONE
        binding.recyclerViewAttendance.visibility = if (show) View.GONE else View.VISIBLE
    }
    
    private fun showEmptyState() {
        val message = when (currentFilter) {
            "clock_in" -> "Belum ada riwayat clock in"
            "clock_out" -> "Belum ada riwayat clock out"
            else -> "Belum ada riwayat absensi"
        }
        binding.tvEmptyState.text = message
        binding.tvEmptyState.visibility = View.VISIBLE
        binding.recyclerViewAttendance.visibility = View.GONE
    }
    
    private fun showError(message: String) {
        binding.tvEmptyState.text = message
        binding.tvEmptyState.visibility = View.VISIBLE
        binding.recyclerViewAttendance.visibility = View.GONE
    }
    
    override fun onSupportNavigateUp(): Boolean {
        onBackPressed()
        return true
    }
}