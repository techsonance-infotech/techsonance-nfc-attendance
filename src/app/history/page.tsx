"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import { getAttendanceRecords } from "@/lib/storage";
import { AttendanceRecord } from "@/types/attendance";
import BottomNav from "@/components/BottomNav";

export default function HistoryPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const allRecords = getAttendanceRecords();
    // Sort by date descending (newest first)
    const sorted = allRecords.sort((a, b) => b.date.localeCompare(a.date));
    setRecords(sorted);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalDays = records.length;
  const presentDays = records.filter(r => r.status === 'present').length;
  const leaveDays = records.filter(r => r.status === 'leave').length;
  const totalMinutes = records
    .filter(r => r.duration)
    .reduce((sum, r) => sum + (r.duration || 0), 0);
  const avgHours = totalMinutes > 0 ? (totalMinutes / 60 / presentDays).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="pt-4 pb-2">
          <h1 className="text-2xl font-bold">Attendance History</h1>
          <p className="text-muted-foreground">View your attendance records</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalDays}</p>
              <p className="text-xs text-muted-foreground">Total Days</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{presentDays}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">{avgHours}h</p>
              <p className="text-xs text-muted-foreground">Avg/Day</p>
            </CardContent>
          </Card>
        </div>

        {leaveDays > 0 && (
          <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
            <CardContent className="pt-6">
              <p className="text-sm">
                <span className="font-semibold text-orange-700 dark:text-orange-400">
                  {leaveDays} day{leaveDays !== 1 ? 's' : ''}
                </span>{' '}
                marked as leave due to missing check-out
              </p>
            </CardContent>
          </Card>
        )}

        {/* Records List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Records</h2>
          
          {records.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No attendance records yet</p>
              </CardContent>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{formatDate(record.date)}</CardTitle>
                    <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                      {record.status === 'present' ? 'Present' : 'Leave'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Time In</p>
                      <p className="font-semibold">{formatTime(record.timeIn)}</p>
                    </div>

                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Time Out</p>
                      <p className="font-semibold">
                        {record.timeOut ? formatTime(record.timeOut) : (
                          <span className="text-orange-600">Not checked out</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {record.duration && (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-semibold">{formatDuration(record.duration)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
