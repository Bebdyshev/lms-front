import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';

export default function HeadCuratorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");

  useEffect(() => {
    loadGroups();
    loadDashboardData(selectedGroupId === "all" ? undefined : parseInt(selectedGroupId));
  }, [selectedGroupId]);

  const loadGroups = async () => {
    try {
      const res = await apiClient.getGroups();
      setGroups(res);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const loadDashboardData = async (groupId?: number) => {
    try {
      setLoading(true);
      const res = await apiClient.getDashboardStats(groupId);
      setData(res);
    } catch (error) {
      console.error('Failed to load HoC dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const curatorPerformance = stats.curator_performance || [];
  const activityTrends = stats.activity_trends || [];
  const atRiskGroups = data?.recent_courses || [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Рады видеть вас, {user?.name?.split(' ')[0] || 'HoC'}!</h1>
          <p className="text-gray-500">Обзор эффективности кураторов и активности студентов</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-[180px] bg-white border-gray-200">
              <SelectValue placeholder="Все группы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все группы</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 py-1.5 px-3">
            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </Badge>
        </div>
      </div>

      {/* Верхние карточки KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardContent className="p-6 text-white">
            <p className="text-blue-100 text-sm font-medium">Всего кураторов</p>
            <h3 className="text-3xl font-bold mt-1 text-white">{stats.total_curators}</h3>
            <div className="mt-4 text-xs text-blue-100 flex items-center">
              Активных на платформе
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-gray-500 text-sm font-medium">Студентов всего</p>
            <h3 className="text-3xl font-bold mt-1 text-gray-900">{stats.total_students}</h3>
            <div className="mt-4 text-xs text-indigo-600 flex items-center font-medium">
              {stats.active_students_7d} активны за 7д
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-gray-500 text-sm font-medium">Просрочено ДЗ</p>
            <h3 className="text-3xl font-bold mt-1 text-red-600">
              {stats.total_overdue || 0}
            </h3>
            <div className="mt-4 text-xs text-red-500 flex items-center font-medium">
              Требует внимания
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <p className="text-gray-500 text-sm font-medium">Неактивных</p>
            <h3 className="text-3xl font-bold mt-1 text-amber-600">
              {stats.inactive_students || 0}
            </h3>
            <div className="mt-4 text-xs text-amber-600 flex items-center font-medium">
              Бездействуют на протяжении 7 дней
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-0">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Активность студентов (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getDate()} ${d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}`;
                    }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                    domain={[0, 100]}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [`${val}%`, 'Активность']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#3B82F6" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-bold">Эффективность кураторов (%)</CardTitle>
            <div 
              className="text-gray-400 hover:text-gray-600 cursor-help p-1"
              title="Эффективность рассчитывается на основе среднего прогресса студентов, отсутствия просрочек и скорости проверки работ."
            >
              <Info className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={curatorPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F9FAFB' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="avg_progress" name="Ср. прогресс (%)" radius={[4, 4, 0, 0]}>
                    {curatorPerformance.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3B82F6' : '#6366F1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица кураторов */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <CardHeader className="bg-white">
          <CardTitle className="text-lg font-bold">Сводная таблица по кураторам</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100 uppercase text-[10px] font-bold">
                <tr>
                  <th className="text-left px-6 py-4">Куратор</th>
                  <th className="text-center px-4 py-4">Группы</th>
                  <th className="text-center px-4 py-4">Студенты</th>
                  <th className="text-center px-4 py-4">Ср. прогресс</th>
                  <th className="text-center px-4 py-4">Просрочено</th>
                  <th className="text-center px-4 py-4">На проверке</th>
                  <th className="text-right px-6 py-4">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {curatorPerformance.map((curator: any) => (
                  <tr key={curator.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                            {curator.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-gray-900">{curator.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-600 font-medium">{curator.groups_count}</td>
                    <td className="px-4 py-4 text-center text-gray-600 font-medium">{curator.students_count}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${curator.avg_progress}%` }} 
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700">{curator.avg_progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant={curator.overdue_count > 5 ? "destructive" : "secondary"} className={curator.overdue_count === 0 ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-50" : ""}>
                        {curator.overdue_count}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                        {curator.pending_grading}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => navigate(`/curator/leaderboard`)}>
                        Обзор <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Группы риска */}
      <Card className="shadow-sm border-0 overflow-hidden">
        <CardHeader className="flex flex-col pb-2">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-700">
              Группы с просрочками
            </CardTitle>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Здесь отображаются группы, в которых есть студенты с невыполненными вовремя заданиями или заданиями, сданными после дедлайна.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-red-50/50 text-red-800 text-[10px] uppercase font-bold border-b border-red-100">
                <tr>
                  <th className="px-6 py-3 text-left">Группа</th>
                  <th className="px-6 py-3 text-left">Куратор</th>
                  <th className="px-6 py-3 text-center">Просрочено</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {atRiskGroups.map((group: any) => (
                  <tr key={group.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{group.title}</td>
                    <td className="px-6 py-4 text-gray-600">{group.curator}</td>
                    <td className="px-6 py-4 text-center font-black text-red-600">{group.overdue_count}</td>
                  </tr>
                ))}
                {atRiskGroups.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic bg-white">
                      Проблемных групп не обнаружено. Все задания под контролем! ✨
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
