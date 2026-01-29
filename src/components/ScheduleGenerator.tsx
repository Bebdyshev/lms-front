
import React, { useState } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter 
} from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Clock, Loader2 } from 'lucide-react';
import { generateSchedule } from '../services/api';
import { toast } from './Toast';

interface ScheduleGeneratorProps {
    groupId: number | null;
    group?: any; // New prop for saved config
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleGenerator({ groupId, group, open, onOpenChange, onSuccess, trigger }: ScheduleGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [weeks, setWeeks] = useState(12);
    
    // Config: { dayIndex: timeString }
    const [scheduleConfig, setScheduleConfig] = useState<Record<number, string>>({});

    // Pre-fill from group's saved config
    React.useEffect(() => {
        if (open && group?.schedule_config) {
            const config = group.schedule_config;
            if (config.start_date) setStartDate(config.start_date.split('T')[0]);
            if (config.weeks_count) setWeeks(config.weeks_count);
            if (config.schedule_items) {
                const newConfig: Record<number, string> = {};
                config.schedule_items.forEach((item: any) => {
                    newConfig[item.day_of_week] = item.time_of_day;
                });
                setScheduleConfig(newConfig);
            }
        } else if (open) {
            // Reset to defaults if no config
            setStartDate(new Date().toISOString().split('T')[0]);
            setWeeks(12);
            setScheduleConfig({});
        }
    }, [open, group]);

    const handleToggleDay = (dayIndex: number) => {
        setScheduleConfig(prev => {
            const next = { ...prev };
            if (next[dayIndex]) {
                delete next[dayIndex];
            } else {
                next[dayIndex] = "19:00"; // Default time
            }
            return next;
        });
    };

    const handleTimeChange = (dayIndex: number, time: string) => {
        setScheduleConfig(prev => ({
            ...prev,
            [dayIndex]: time
        }));
    };

    const handleGenerate = async () => {
        if (!groupId) return;
        
        const items = Object.entries(scheduleConfig).map(([day, time]) => ({
            day_of_week: parseInt(day),
            time_of_day: time
        }));

        if (items.length === 0) {
            toast("Please select at least one day", "error");
            return;
        }

        setIsGenerating(true);
        try {
            await generateSchedule({
                group_id: groupId,
                start_date: startDate,
                schedule_items: items,
                weeks_count: weeks
            });
            toast("Schedule generated successfully", "success");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error("Failed to generate schedule", e);
            toast("Failed to generate schedule", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Generate Class Schedule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input 
                            id="start-date" 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Weekly Schedule</Label>
                        <div className="grid gap-2 border rounded-md p-3">
                            {DAYS.map((day, i) => {
                                const isSelected = scheduleConfig[i] !== undefined;
                                return (
                                    <div key={day} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`day-${i}`} 
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleDay(i)}
                                            />
                                            <Label htmlFor={`day-${i}`} className={isSelected ? "font-medium" : "text-muted-foreground"}>
                                                {day}
                                            </Label>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center w-28">
                                                <Clock className="w-3 h-3 mr-2 text-muted-foreground" />
                                                <Input 
                                                    type="time" 
                                                    className="h-7 text-xs"
                                                    value={scheduleConfig[i]}
                                                    onChange={(e) => handleTimeChange(i, e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="weeks">Duration (Weeks)</Label>
                        <Input 
                            id="weeks" 
                            type="number" 
                            min={1} 
                            max={24}
                            value={weeks}
                            onChange={(e) => setWeeks(parseInt(e.target.value) || 12)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
