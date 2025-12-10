import { useState, useEffect, useMemo } from 'react';
import { GUILD_ID } from '../constants';
import { getBirthdays, setBirthday, clearBirthday } from '../services/api';
import Modal from '../components/Modal';
import FormField from '../components/FormField';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './BirthdayCalendar.css';

interface OC {
  _id: string;
  name: string;
  fandom: string;
  birthday?: string;
  ownerId: string;
}

export default function BirthdayCalendar() {
  const [birthdays, setBirthdays] = useState<OC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isSetBirthdayModalOpen, setIsSetBirthdayModalOpen] = useState(false);
  const [isClearBirthdayDialogOpen, setIsClearBirthdayDialogOpen] = useState(false);
  
  const [selectedOC, setSelectedOC] = useState<OC | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [birthdayDate, setBirthdayDate] = useState('');

  useEffect(() => {
    fetchBirthdays();
  }, [currentMonth, currentYear, viewMode]);

  const fetchBirthdays = async () => {
    try {
      setLoading(true);
      setError(null);
      // In list view, fetch ALL birthdays. In calendar view, fetch only current month
      const monthStr = viewMode === 'list' ? undefined : String(currentMonth + 1).padStart(2, '0');
      const response = await getBirthdays(GUILD_ID, monthStr);
      setBirthdays(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch birthdays');
    } finally {
      setLoading(false);
    }
  };


  const submitBirthday = async () => {
    if (!selectedOC || !birthdayDate) return;
    
    // Validate MM-DD format
    if (!/^\d{2}-\d{2}$/.test(birthdayDate)) {
      setError('Birthday must be in MM-DD format (e.g., 03-15)');
      return;
    }

    try {
      await setBirthday(selectedOC._id, birthdayDate);
      setIsSetBirthdayModalOpen(false);
      setBirthdayDate('');
      fetchBirthdays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set birthday');
    }
  };

  const confirmClearBirthday = async () => {
    if (!selectedOC) return;
    
    try {
      await clearBirthday(selectedOC._id);
      setIsClearBirthdayDialogOpen(false);
      setSelectedOC(null);
      fetchBirthdays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to clear birthday');
    }
  };

  const getTodayBirthdays = () => {
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return birthdays.filter(oc => oc.birthday === todayStr);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Create calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{
      date: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      birthdays: OC[];
    }> = [];

    // Add previous month's days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonthLastDay - i,
        month: currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
        isCurrentMonth: false,
        birthdays: []
      });
    }

    // Add current month's days
    for (let date = 1; date <= daysInMonth; date++) {
      const dateStr = `${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
      const dayBirthdays = birthdays.filter(oc => oc.birthday === dateStr);
      
      days.push({
        date,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        birthdays: dayBirthdays
      });
    }

    // Add next month's days to fill the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let date = 1; date <= remainingDays; date++) {
      days.push({
        date,
        month: currentMonth + 1,
        year: currentMonth === 11 ? currentYear + 1 : currentYear,
        isCurrentMonth: false,
        birthdays: []
      });
    }

    return days;
  }, [currentYear, currentMonth, birthdays]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const sortedBirthdays = [...birthdays].sort((a, b) => {
    if (!a.birthday || !b.birthday) return 0;
    return a.birthday.localeCompare(b.birthday);
  });

  const columns = [
    {
      key: 'name',
      label: 'OC Name',
      sortable: true,
      render: (oc: OC) => <strong>{oc.name}</strong>
    },
    {
      key: 'fandom',
      label: 'Fandom',
      sortable: true
    },
    {
      key: 'birthday',
      label: 'Birthday',
      sortable: true,
      render: (oc: OC) => oc.birthday || '-'
    }
  ];

  if (loading) {
    return (
      <div className="birthday-calendar-page">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const todayBirthdays = getTodayBirthdays();
  const today = new Date();
  const isToday = (day: typeof calendarDays[0]) => {
    return day.isCurrentMonth && 
           day.date === today.getDate() && 
           day.month === today.getMonth() && 
           day.year === today.getFullYear();
  };

  return (
    <div className="birthday-calendar-page">
      <div className="birthday-calendar-header">
        <div>
          <h1>Birthday Calendar</h1>
        </div>
        <div className="birthday-calendar-actions">
          <button 
            onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
            className="btn-secondary"
          >
            <i className={`fas fa-${viewMode === 'calendar' ? 'list' : 'calendar'}`}></i> 
            {viewMode === 'calendar' ? ' List View' : ' Calendar View'}
          </button>
        </div>
      </div>
      <p className="page-instructions">
        <i className="fas fa-info-circle"></i>
        <span>Your OCs' birthdays will display here. To have your OCs' birthdays display, please add an OC using the <strong>OC Manager</strong> page and set their birthday.</span>
      </p>

      {error && (
        <div className="birthday-calendar-error">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}

      {todayBirthdays.length > 0 && (
        <div className="birthday-today">
          <h2>
            <i className="fas fa-birthday-cake"></i> Birthdays Today!
          </h2>
          <div className="birthday-today-list">
            {todayBirthdays.map(oc => (
              <div key={oc._id} className="birthday-today-item">
                <strong>{oc.name}</strong> ({oc.fandom})
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'calendar' ? (
        <div className="calendar-container">
          <div className="calendar-header-nav">
            <button onClick={() => navigateMonth('prev')} className="calendar-nav-btn">
              <i className="fas fa-chevron-left"></i>
            </button>
            <h2 className="calendar-month-year">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <button onClick={() => navigateMonth('next')} className="calendar-nav-btn">
              <i className="fas fa-chevron-right"></i>
            </button>
            <button onClick={goToToday} className="calendar-today-btn">
              Today
            </button>
          </div>

          <div className="calendar-grid">
            {dayNames.map(day => (
              <div key={day} className="calendar-day-header">
                {day}
              </div>
            ))}
            
            {calendarDays.map((day, idx) => {
              const hasBirthdays = day.birthdays.length > 0;
              const isTodayDay = isToday(day);
              
              return (
                <div
                  key={idx}
                  className={`calendar-day ${
                    !day.isCurrentMonth ? 'calendar-day-other-month' : ''
                  } ${isTodayDay ? 'calendar-day-today' : ''} ${
                    hasBirthdays ? 'calendar-day-has-birthday' : ''
                  }`}
                >
                  <div className="calendar-day-number">{day.date}</div>
                  {hasBirthdays && (
                    <div className="calendar-day-birthdays">
                      {day.birthdays.slice(0, 3).map(oc => (
                        <div key={oc._id} className="calendar-birthday-item" title={`${oc.name} (${oc.fandom})`}>
                          <i className="fas fa-birthday-cake"></i> {oc.name}
                        </div>
                      ))}
                      {day.birthdays.length > 3 && (
                        <div className="calendar-birthday-more">
                          +{day.birthdays.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {birthdays.length === 0 && (
            <div className="calendar-empty-state">
              <EmptyState
                icon="fa-birthday-cake"
                title="No Birthdays This Month"
                message={`No OCs have birthdays in ${monthNames[currentMonth]}. To add birthdays, go to the OC Manager page and set a birthday for your OCs.`}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          {birthdays.length === 0 ? (
            <EmptyState
              icon="fa-birthday-cake"
              title="No Birthdays Found"
              message="No OCs have birthdays set. To add birthdays, go to the OC Manager page and set a birthday for your OCs."
            />
          ) : (
            <>
              <p className="page-instructions" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <i className="fas fa-info-circle"></i>
                <span>Showing all birthdays across all months. Use the calendar view to see birthdays for a specific month.</span>
              </p>
              <DataTable
                data={sortedBirthdays}
                columns={columns}
                keyExtractor={(oc) => oc._id}
                searchable
                searchPlaceholder="Search birthdays..."
              />
            </>
          )}
        </>
      )}

      {/* Set Birthday Modal */}
      <Modal
        isOpen={isSetBirthdayModalOpen}
        onClose={() => setIsSetBirthdayModalOpen(false)}
        title={`Set Birthday for ${selectedOC?.name}`}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsSetBirthdayModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitBirthday} disabled={!birthdayDate.trim()}>
              Set Birthday
            </button>
          </>
        }
      >
        <FormField
          label="Birthday (MM-DD)"
          name="birthday"
          value={birthdayDate}
          onChange={setBirthdayDate}
          placeholder="03-15"
          required
        />
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginTop: 'var(--spacing-sm)' }}>
          Format: MM-DD (e.g., 03-15 for March 15th)
        </p>
      </Modal>

      {/* Clear Birthday Confirmation */}
      <ConfirmDialog
        isOpen={isClearBirthdayDialogOpen}
        title="Clear Birthday"
        message={`Are you sure you want to clear the birthday for "${selectedOC?.name}"?`}
        confirmLabel="Clear"
        cancelLabel="Cancel"
        onConfirm={confirmClearBirthday}
        onCancel={() => setIsClearBirthdayDialogOpen(false)}
        variant="warning"
      />
    </div>
  );
}
