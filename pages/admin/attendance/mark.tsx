/**
 * Admin/Teacher - Mark Attendance
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../layout/PageWrapper/PageWrapper';
import Page from '../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../layout/SubHeader/SubHeader';
import Button from '../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../components/bootstrap/Card';
import { useAuth } from '../../../lib/auth/useAuth';
import { UserRole, Class, Student, AttendanceStatus } from '../../../lib/types/database';
import { supabase } from '../../../lib/supabase/client';
import FormGroup from '../../../components/bootstrap/forms/FormGroup';
import Select from '../../../components/bootstrap/forms/Select';
import Input from '../../../components/bootstrap/forms/Input';
import showNotification from '../../../components/extras/showNotification';

interface StudentWithAttendance extends Student {
	attendance_status?: AttendanceStatus;
	attendance_id?: string;
}

const MarkAttendancePage: NextPage = () => {
	const router = useRouter();
	const { user, role, loading } = useAuth();
	const [classes, setClasses] = useState<Class[]>([]);
	const [selectedClassId, setSelectedClassId] = useState('');
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
	const [students, setStudents] = useState<StudentWithAttendance[]>([]);
	const [loadingStudents, setLoadingStudents] = useState(false);
	const [saving, setSaving] = useState(false);

	// Protect route - only super admin and teachers
	useEffect(() => {
		if (!loading && (!user || (role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER))) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch classes
	useEffect(() => {
		const fetchClasses = async () => {
			if (!user) return;
			try {
				const { data, error } = await supabase
					.from('classes')
					.select('*')
					.order('grade_level', { ascending: true });

				if (error) throw error;
				setClasses(data || []);
			} catch (error) {
				console.error('Error fetching classes:', error);
			}
		};
		fetchClasses();
	}, [user]);

	// Fetch students and their attendance for selected class and date
	const fetchStudentsWithAttendance = async () => {
		if (!selectedClassId) return;
		setLoadingStudents(true);
		try {
			// Fetch students in the class
			const { data: studentsData, error: studentsError } = await supabase
				.from('students')
				.select('*')
				.eq('class_id', selectedClassId)
				.order('full_name', { ascending: true });

			if (studentsError) throw studentsError;

			// Fetch existing attendance records for the date
			const { data: attendanceData, error: attendanceError } = await supabase
				.from('attendance_records')
				.select('*')
				.eq('class_id', selectedClassId)
				.eq('date', selectedDate);

			if (attendanceError) throw attendanceError;

			// Merge students with their attendance status
			const studentsWithAttendance = (studentsData || []).map((student) => {
				const attendance = attendanceData?.find((a) => a.student_id === student.id);
				return {
					...student,
					attendance_status: attendance?.status,
					attendance_id: attendance?.id,
				};
			});

			setStudents(studentsWithAttendance);
		} catch (error) {
			console.error('Error fetching students:', error);
			showNotification('Error', 'Failed to load students', 'danger');
		} finally {
			setLoadingStudents(false);
		}
	};

	useEffect(() => {
		if (selectedClassId && selectedDate) {
			fetchStudentsWithAttendance();
		}
	}, [selectedClassId, selectedDate]);

	const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
		setStudents((prev) =>
			prev.map((s) => (s.id === studentId ? { ...s, attendance_status: status } : s))
		);
	};

	const handleSaveAttendance = async () => {
		if (!selectedClassId || !selectedDate) {
			showNotification('Error', 'Please select class and date', 'warning');
			return;
		}

		setSaving(true);
		try {
			// Get teacher ID if user is a teacher
			let teacherId = null;
			if (role === UserRole.TEACHER) {
				const { data: teacherData } = await supabase
					.from('teachers')
					.select('id')
					.eq('user_id', user?.id)
					.single();
				teacherId = teacherData?.id;
			}

			// Prepare attendance records
			const attendanceRecords = students
				.filter((s) => s.attendance_status)
				.map((s) => ({
					student_id: s.id,
					class_id: selectedClassId,
					date: selectedDate,
					status: s.attendance_status!,
					marked_by: teacherId,
				}));

			// Delete existing records for this class and date
			await supabase
				.from('attendance_records')
				.delete()
				.eq('class_id', selectedClassId)
				.eq('date', selectedDate);

			// Insert new records
			const { error } = await supabase.from('attendance_records').insert(attendanceRecords);

			if (error) throw error;

			showNotification('Success', 'Attendance saved successfully', 'success');
			fetchStudentsWithAttendance();
		} catch (error: any) {
			showNotification('Error', error.message, 'danger');
		} finally {
			setSaving(false);
		}
	};

	if (loading || !user || (role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER)) return null;

	return (
		<PageWrapper>
			<Head>
				<title>Mark Attendance - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.back()}>
						Back
					</Button>
					<span className='h4 mb-0 fw-bold'>Mark Attendance</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='success'
						icon='Save'
						onClick={handleSaveAttendance}
						isDisable={saving || students.length === 0}>
						{saving ? 'Saving...' : 'Save Attendance'}
					</Button>
				</SubHeaderRight>
			</SubHeader>
			<Page container='fluid'>
				<div className='row mb-4'>
					<div className='col-12'>
						<Card>
							<CardBody>
								<div className='row g-3'>
									<div className='col-md-6'>
										<FormGroup id='class' label='Select Class'>
											<Select
												value={selectedClassId}
												onChange={(e: any) => setSelectedClassId(e.target.value)}>
												<option value=''>Select a class</option>
												{classes.map((cls) => (
													<option key={cls.id} value={cls.id}>
														{cls.name} - {cls.grade_level}
													</option>
												))}
											</Select>
										</FormGroup>
									</div>
									<div className='col-md-6'>
										<FormGroup id='date' label='Date'>
											<Input
												type='date'
												value={selectedDate}
												onChange={(e: any) => setSelectedDate(e.target.value)}
											/>
										</FormGroup>
									</div>
								</div>
							</CardBody>
						</Card>
					</div>
				</div>

				{selectedClassId && (
					<div className='row'>
						<div className='col-12'>
							<Card>
								<CardHeader>
									<CardLabel icon='People'>
										<CardTitle>Students</CardTitle>
									</CardLabel>
								</CardHeader>
								<CardBody className='table-responsive'>
									{loadingStudents ? (
										<div className='text-center py-5'>Loading students...</div>
									) : students.length === 0 ? (
										<div className='text-center py-5 text-muted'>
											No students found in this class
										</div>
									) : (
										<table className='table table-modern table-hover'>
											<thead>
												<tr>
													<th>Admission No.</th>
													<th>Student Name</th>
													<th>Present</th>
													<th>Absent</th>
													<th>Late</th>
												</tr>
											</thead>
											<tbody>
												{students.map((student) => (
													<tr key={student.id}>
														<td>{student.admission_number}</td>
														<td>
															<div className='fw-bold'>{student.full_name}</div>
														</td>
														<td>
															<div className='form-check'>
																<input
																	className='form-check-input'
																	type='radio'
																	name={`attendance-${student.id}`}
																	id={`present-${student.id}`}
																	checked={student.attendance_status === AttendanceStatus.PRESENT}
																	onChange={() => handleAttendanceChange(student.id, AttendanceStatus.PRESENT)}
																/>
																<label className='form-check-label' htmlFor={`present-${student.id}`}>
																	Present
																</label>
															</div>
														</td>
														<td>
															<div className='form-check'>
																<input
																	className='form-check-input'
																	type='radio'
																	name={`attendance-${student.id}`}
																	id={`absent-${student.id}`}
																	checked={student.attendance_status === AttendanceStatus.ABSENT}
																	onChange={() => handleAttendanceChange(student.id, AttendanceStatus.ABSENT)}
																/>
																<label className='form-check-label' htmlFor={`absent-${student.id}`}>
																	Absent
																</label>
															</div>
														</td>
														<td>
															<div className='form-check'>
																<input
																	className='form-check-input'
																	type='radio'
																	name={`attendance-${student.id}`}
																	id={`late-${student.id}`}
																	checked={student.attendance_status === AttendanceStatus.LATE}
																	onChange={() => handleAttendanceChange(student.id, AttendanceStatus.LATE)}
																/>
																<label className='form-check-label' htmlFor={`late-${student.id}`}>
																	Late
																</label>
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									)}
								</CardBody>
							</Card>
						</div>
					</div>
				)}
			</Page>
		</PageWrapper>
	);
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default MarkAttendancePage;


