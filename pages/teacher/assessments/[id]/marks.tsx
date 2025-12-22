/**
 * Teacher - Enter Marks for Assessment
 */

import React, { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import PageWrapper from '../../../../layout/PageWrapper/PageWrapper';
import Page from '../../../../layout/Page/Page';
import SubHeader, { SubHeaderLeft, SubHeaderRight } from '../../../../layout/SubHeader/SubHeader';
import Button from '../../../../components/bootstrap/Button';
import Card, { CardBody, CardHeader, CardLabel, CardTitle } from '../../../../components/bootstrap/Card';
import { useAuth } from '../../../../lib/auth/useAuth';
import { UserRole, Assessment, Class, Subject, Student } from '../../../../lib/types/database';
import { supabase } from '../../../../lib/supabase/client';
import FormGroup from '../../../../components/bootstrap/forms/FormGroup';
import Select from '../../../../components/bootstrap/forms/Select';
import Input from '../../../../components/bootstrap/forms/Input';
import showNotification from '../../../../components/extras/showNotification';

interface StudentGrade {
	student_id: string;
	student_name: string;
	admission_number: string;
	marks_obtained: number | null;
	grade_id?: string;
}

const EnterMarksPage: NextPage = () => {
	const router = useRouter();
	const { id: assessmentId } = router.query;
	const { user, role, loading } = useAuth();
	const [assessment, setAssessment] = useState<Assessment | null>(null);
	const [classes, setClasses] = useState<Class[]>([]);
	const [subjects, setSubjects] = useState<Subject[]>([]);
	const [selectedClassId, setSelectedClassId] = useState('');
	const [selectedSubjectId, setSelectedSubjectId] = useState('');
	const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
	const [loadingData, setLoadingData] = useState(false);
	const [saving, setSaving] = useState(false);

	// Protect route
	useEffect(() => {
		if (!loading && (!user || (role !== UserRole.SUPER_ADMIN && role !== UserRole.TEACHER))) {
			router.push('/auth-pages/login');
		}
	}, [user, role, loading, router]);

	// Fetch assessment details
	useEffect(() => {
		const fetchAssessment = async () => {
			if (!assessmentId || typeof assessmentId !== 'string') return;
			try {
				const { data, error } = await supabase
					.from('assessments')
					.select('*')
					.eq('id', assessmentId)
					.single();

				if (error) throw error;
				setAssessment(data);
			} catch (error) {
				console.error('Error fetching assessment:', error);
				showNotification('Error', 'Failed to load assessment', 'danger');
			}
		};
		fetchAssessment();
	}, [assessmentId]);

	// Fetch classes and subjects
	useEffect(() => {
		const fetchData = async () => {
			if (!user) return;
			try {
				const { data: classesData, error: classesError } = await supabase
					.from('classes')
					.select('*')
					.order('grade_level', { ascending: true });

				if (classesError) throw classesError;
				setClasses(classesData || []);

				const { data: subjectsData, error: subjectsError } = await supabase
					.from('subjects')
					.select('*')
					.order('name', { ascending: true });

				if (subjectsError) throw subjectsError;
				setSubjects(subjectsData || []);
			} catch (error) {
				console.error('Error fetching data:', error);
			}
		};
		fetchData();
	}, [user]);

	// Fetch students and their grades
	const fetchStudentGrades = async () => {
		if (!selectedClassId || !selectedSubjectId || !assessmentId) return;
		setLoadingData(true);
		try {
			// Fetch students in the class
			const { data: studentsData, error: studentsError } = await supabase
				.from('students')
				.select('*')
				.eq('class_id', selectedClassId)
				.order('full_name', { ascending: true });

			if (studentsError) throw studentsError;

			// Fetch existing grades
			const { data: gradesData, error: gradesError } = await supabase
				.from('grades')
				.select('*')
				.eq('assessment_id', assessmentId)
				.eq('subject_id', selectedSubjectId);

			if (gradesError) throw gradesError;

			// Merge students with their grades
			const studentGradesData = (studentsData || []).map((student) => {
				const grade = gradesData?.find((g) => g.student_id === student.id);
				return {
					student_id: student.id,
					student_name: student.full_name,
					admission_number: student.admission_number,
					marks_obtained: grade?.marks_obtained || null,
					grade_id: grade?.id,
				};
			});

			setStudentGrades(studentGradesData);
		} catch (error) {
			console.error('Error fetching student grades:', error);
			showNotification('Error', 'Failed to load student grades', 'danger');
		} finally {
			setLoadingData(false);
		}
	};

	useEffect(() => {
		if (selectedClassId && selectedSubjectId && assessmentId) {
			fetchStudentGrades();
		}
	}, [selectedClassId, selectedSubjectId, assessmentId]);

	const handleMarksChange = (studentId: string, marks: number | null) => {
		setStudentGrades((prev) =>
			prev.map((sg) => (sg.student_id === studentId ? { ...sg, marks_obtained: marks } : sg))
		);
	};

	const handleSaveMarks = async () => {
		if (!selectedClassId || !selectedSubjectId || !assessmentId) {
			showNotification('Error', 'Please select class and subject', 'warning');
			return;
		}

		setSaving(true);
		try {
			// Get teacher ID
			let teacherId = null;
			if (role === UserRole.TEACHER) {
				const { data: teacherData } = await supabase
					.from('teachers')
					.select('id')
					.eq('user_id', user?.id)
					.single();
				teacherId = teacherData?.id;
			}

			// Prepare grade records
			const gradeRecords = studentGrades
				.filter((sg) => sg.marks_obtained !== null)
				.map((sg) => ({
					student_id: sg.student_id,
					assessment_id: assessmentId as string,
					subject_id: selectedSubjectId,
					marks_obtained: sg.marks_obtained!,
					entered_by: teacherId,
				}));

			// Delete existing grades for this assessment, subject, and students
			const studentIds = studentGrades.map((sg) => sg.student_id);
			await supabase
				.from('grades')
				.delete()
				.eq('assessment_id', assessmentId as string)
				.eq('subject_id', selectedSubjectId)
				.in('student_id', studentIds);

			// Insert new grades
			const { error } = await supabase.from('grades').insert(gradeRecords);

			if (error) throw error;

			showNotification('Success', 'Marks saved successfully', 'success');
			fetchStudentGrades();
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
				<title>Enter Marks - School Management System</title>
			</Head>
			<SubHeader>
				<SubHeaderLeft>
					<Button color='info' isLink icon='ArrowBack' onClick={() => router.push('/teacher/assessments')}>
						Back to Assessments
					</Button>
					<span className='h4 mb-0 fw-bold'>
						Enter Marks {assessment && `- ${assessment.name}`}
					</span>
				</SubHeaderLeft>
				<SubHeaderRight>
					<Button
						color='success'
						icon='Save'
						onClick={handleSaveMarks}
						isDisable={saving || studentGrades.length === 0}>
						{saving ? 'Saving...' : 'Save Marks'}
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
										<FormGroup id='subject' label='Select Subject'>
											<Select
												value={selectedSubjectId}
												onChange={(e: any) => setSelectedSubjectId(e.target.value)}>
												<option value=''>Select a subject</option>
												{subjects.map((subject) => (
													<option key={subject.id} value={subject.id}>
														{subject.name} ({subject.code})
													</option>
												))}
											</Select>
										</FormGroup>
									</div>
								</div>
								{assessment && (
									<div className='alert alert-info mt-3'>
										<strong>Maximum Marks:</strong> {assessment.max_marks}
									</div>
								)}
							</CardBody>
						</Card>
					</div>
				</div>

				{selectedClassId && selectedSubjectId && (
					<div className='row'>
						<div className='col-12'>
							<Card>
								<CardHeader>
									<CardLabel icon='People'>
										<CardTitle>Students</CardTitle>
									</CardLabel>
								</CardHeader>
								<CardBody className='table-responsive'>
									{loadingData ? (
										<div className='text-center py-5'>Loading students...</div>
									) : studentGrades.length === 0 ? (
										<div className='text-center py-5 text-muted'>
											No students found in this class
										</div>
									) : (
										<table className='table table-modern table-hover'>
											<thead>
												<tr>
													<th>Admission No.</th>
													<th>Student Name</th>
													<th>Marks Obtained</th>
												</tr>
											</thead>
											<tbody>
												{studentGrades.map((sg) => (
													<tr key={sg.student_id}>
														<td>{sg.admission_number}</td>
														<td>
															<div className='fw-bold'>{sg.student_name}</div>
														</td>
														<td>
															<Input
																type='number'
																value={sg.marks_obtained || ''}
																onChange={(e: any) =>
																	handleMarksChange(
																		sg.student_id,
																		e.target.value ? parseFloat(e.target.value) : null
																	)
																}
																min={0}
																max={assessment?.max_marks}
																step={0.01}
																placeholder='Enter marks'
																style={{ maxWidth: '150px' }}
															/>
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

export const getStaticPaths: GetStaticPaths = async () => {
	return {
		paths: [],
		fallback: 'blocking',
	};
};

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
	props: {
		// @ts-ignore
		...(await serverSideTranslations(locale, ['common', 'menu'])),
	},
});

export default EnterMarksPage;


